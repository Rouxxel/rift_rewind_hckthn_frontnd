import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { storage } from '../utils/storage';
import { cache, CACHE_KEYS } from '../utils/cache';
import { getChampions } from '../services/championCache';

interface PredictionsProps {
  onBack: () => void;
}

interface ChampionWinrate {
  name: string;
  title: string;
  champion_id: string;
  tags: string[];
  win_rate: number;
  pick_rate: number;
  ban_rate: number;
  games_played: number;
  primary_role: string;
}



export const Predictions: React.FC<PredictionsProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'winrates' | 'predictions'>('winrates');
  const [champions, setChampions] = useState<Record<string, any>>({});
  const [winrates, setWinrates] = useState<ChampionWinrate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Caching states (now using persistent cache)
  const [championsLoaded, setChampionsLoaded] = useState(false);
  const [winratesLoaded, setWinratesLoaded] = useState(false);

  // Winrates filters (removed role)
  const [rank, setRank] = useState('ALL');
  const [sortBy, setSortBy] = useState('name'); // Default to alphabetical
  const [winrateSearch, setWinrateSearch] = useState(''); // Search for winrates
  const [currentLimit, setCurrentLimit] = useState(100); // Pagination limit - start with more
  const [hasMoreChampions, setHasMoreChampions] = useState(true); // Track if more data available
  const [loadingMore, setLoadingMore] = useState(false); // Loading state for load more

  // Team composition
  const [blueTeam, setBlueTeam] = useState<string[]>([]);
  const [redTeam, setRedTeam] = useState<string[]>([]);
  const [gameMode, setGameMode] = useState('CLASSIC');
  const [averageRank, setAverageRank] = useState('GOLD');
  const [prediction, setPrediction] = useState<any>(null);

  // Champion search
  const [championSearch, setChampionSearch] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<'blue' | 'red'>('blue');

  // User data
  const userData = storage.getUserData();

  useEffect(() => {
    // Load champions on mount (check cache first)
    loadChampions();

    // Load winrates if on winrates tab - but only if not already loaded
    if (activeTab === 'winrates') {
      loadWinratesIfNeeded();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'winrates' && winratesLoaded) {
      // Reset limit when filters change
      setCurrentLimit(100);
      setHasMoreChampions(true);

      // Always try to use cached data first for filter changes
      const cachedAllWinrates = cache.get<ChampionWinrate[]>(CACHE_KEYS.WINRATES_ALL);

      if (cachedAllWinrates) {
        console.log('✅ Filter changed, using cached data with new filters - no API call needed');
        applyFiltersAndSort(cachedAllWinrates, 100);
      } else {
        console.log('🔄 Cache expired during filter change, reloading from API...');
        setWinratesLoaded(false); // Reset loaded state
        loadWinrates(100);
      }
    }
  }, [rank, sortBy, winratesLoaded]);

  const loadChampions = async () => {
    if (championsLoaded) return; // Skip if already loaded in this session

    try {
      const championsData = await getChampions();
      setChampions(championsData);
      setChampionsLoaded(true);
    } catch (err: any) {
      console.error('❌ Failed to load champions:', err);
      setError('Failed to load champions. Please try again later.');
    }
  };

  // New function to check if winrates need to be loaded
  const loadWinratesIfNeeded = async () => {
    // Skip if already loaded in this session
    if (winratesLoaded) {
      console.log('✅ Winrates already loaded in this session - no API call needed');
      return;
    }

    const cachedAllWinrates = cache.get<ChampionWinrate[]>(CACHE_KEYS.WINRATES_ALL);

    if (cachedAllWinrates) {
      console.log('✅ Using existing cached winrates data - no API call needed');
      applyFiltersAndSort(cachedAllWinrates, 100);
      setWinratesLoaded(true);
      return;
    }

    // No cached data, load from API
    console.log('🔄 No cached data found, making API call...');
    await loadWinrates(100);
  };

  const loadWinrates = async (limit: number = currentLimit) => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Loading ALL winrates from API (one-time fetch)...');

      // Fetch ALL champions with maximum limit to cache everything
      const response = await apiService.getChampionWinrates('ALL', 'ALL', 'name', 200);
      console.log('✅ All winrates loaded and cached:', response);

      const allChampionsList = response.champions || [];

      // Cache ALL the data for 15 minutes
      cache.set(CACHE_KEYS.WINRATES_ALL, allChampionsList, 15);

      // Apply current filters and sorting
      applyFiltersAndSort(allChampionsList, limit);
      setWinratesLoaded(true);

    } catch (err: any) {
      console.error('❌ Failed to load winrates:', err);
      setError(`Failed to load champion winrates: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // New function to apply filters and sorting client-side
  const applyFiltersAndSort = (allChampions: ChampionWinrate[], limit: number) => {
    let filteredChampions = [...allChampions];

    // Apply rank filter (if backend doesn't handle it, we'd filter here)
    // For now, assuming backend handles rank filtering, so we use all data

    // Apply sorting
    if (sortBy === 'name') {
      filteredChampions.sort((a: ChampionWinrate, b: ChampionWinrate) => a.name.localeCompare(b.name));
    } else {
      filteredChampions.sort((a: ChampionWinrate, b: ChampionWinrate) => {
        const aValue = a[sortBy as keyof ChampionWinrate];
        const bValue = b[sortBy as keyof ChampionWinrate];

        if (aValue === bValue) {
          return a.name.localeCompare(b.name);
        }

        if (sortBy === 'games_played') {
          return (bValue as number) - (aValue as number); // Descending for games
        } else {
          return (bValue as number) - (aValue as number); // Descending for rates
        }
      });
    }

    // Apply limit
    const limitedChampions = filteredChampions.slice(0, limit);

    setWinrates(limitedChampions);
    setHasMoreChampions(filteredChampions.length > limit);
  };

  const loadMoreWinrates = async () => {
    const newLimit = currentLimit + 100;
    setLoadingMore(true);

    try {
      console.log(`📋 Loading more winrates from cache (${newLimit} total)...`);

      // Always get cached data first (should exist at this point)
      const cachedAllWinrates = cache.get<ChampionWinrate[]>(CACHE_KEYS.WINRATES_ALL);

      if (cachedAllWinrates) {
        // Use cached data with new limit
        applyFiltersAndSort(cachedAllWinrates, newLimit);
        setCurrentLimit(newLimit);
        console.log('✅ More winrates loaded from cache - no API call needed');
      } else {
        // This shouldn't happen, but fallback to API if cache is somehow empty
        console.log('⚠️ Cache unexpectedly empty during load more, reloading from API...');
        await loadWinrates(newLimit);
        setCurrentLimit(newLimit);
      }

    } catch (err: any) {
      console.error('❌ Failed to load more winrates:', err);
      setError(`Failed to load more champion winrates: ${err.message}`);
    } finally {
      setLoadingMore(false);
    }
  };

  const searchChampions = (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const results = Object.values(champions)
      .filter((champ: any) =>
        champ.name.toLowerCase().includes(query.toLowerCase())
      )
      .map((champ: any) => champ.name)
      .slice(0, 10);

    setSearchResults(results);
  };

  const addChampionToTeam = (championName: string) => {
    if (selectedTeam === 'blue' && blueTeam.length < 5 && !blueTeam.includes(championName)) {
      setBlueTeam([...blueTeam, championName]);
    } else if (selectedTeam === 'red' && redTeam.length < 5 && !redTeam.includes(championName)) {
      setRedTeam([...redTeam, championName]);
    }
    setChampionSearch('');
    setSearchResults([]);
  };

  const removeChampionFromTeam = (championName: string, team: 'blue' | 'red') => {
    if (team === 'blue') {
      setBlueTeam(blueTeam.filter(name => name !== championName));
    } else {
      setRedTeam(redTeam.filter(name => name !== championName));
    }
  };

  const predictMatch = async () => {
    if (blueTeam.length !== 5 || redTeam.length !== 5) {
      setError('Both teams must have exactly 5 champions');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🔮 [Predictions] Starting match prediction');
      console.log('🔵 [Predictions] Blue team:', blueTeam);
      console.log('🔴 [Predictions] Red team:', redTeam);
      console.log('⚙️ [Predictions] Game mode:', gameMode, '| Rank:', averageRank);

      // Try prediction with smart name resolution
      const result = await tryPredictionWithSmartRetry(blueTeam, redTeam);

      if (result.success && result.response) {
        console.log('✅ [Predictions] Prediction successful!');
        console.log('📊 [Predictions] Result:', result.response);
        setPrediction(result.response);

        // Cache the prediction with a fixed key (always overwrites previous prediction)
        const cacheKey = 'rift_rewind_cache_current_match_prediction';
        const cacheData = {
          data: result.response,
          blue_team: result.blueTeam,
          red_team: result.redTeam,
          game_mode: gameMode,
          average_rank: averageRank,
          timestamp: Date.now(),
          expiresIn: 30 * 60 * 1000 // 30 minutes
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        console.log('💾 [Predictions] Cached current prediction:', cacheKey);
        console.log('📦 [Predictions] Cache data:', cacheData);
      } else {
        throw new Error(result.error || 'Failed to predict match outcome');
      }
    } catch (err: any) {
      console.error('❌ [Predictions] Prediction failed:', err);
      setError(`Failed to predict match outcome: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Smart retry mechanism for champion name resolution
  const tryPredictionWithSmartRetry = async (
    blueTeamOriginal: string[],
    redTeamOriginal: string[]
  ): Promise<{ success: boolean; response?: any; blueTeam?: string[]; redTeam?: string[]; error?: string }> => {
    console.log('🔄 [Predictions] Starting smart retry mechanism');

    // Generate all possible name variations for each champion
    const blueVariations = blueTeamOriginal.map(name => getChampionNameVariations(name));
    const redVariations = redTeamOriginal.map(name => getChampionNameVariations(name));

    console.log('🎭 [Predictions] Blue team variations:', blueVariations);
    console.log('🎭 [Predictions] Red team variations:', redVariations);

    const maxAttempts = 50;
    let attemptCount = 0;

    const tryNextCombination = async (
      blueIndices: number[],
      redIndices: number[]
    ): Promise<{ success: boolean; response?: any; blueTeam?: string[]; redTeam?: string[]; error?: string }> => {
      if (attemptCount >= maxAttempts) {
        console.error('❌ [Predictions] Max attempts reached');
        return { success: false, error: 'Maximum retry attempts reached' };
      }

      attemptCount++;

      const blueTeam = blueIndices.map((idx, i) => blueVariations[i][idx]);
      const redTeam = redIndices.map((idx, i) => redVariations[i][idx]);

      console.log(`🔄 [Predictions] Attempt ${attemptCount}:`, { blueTeam, redTeam });

      try {
        const response = await apiService.getMatchOutcome(blueTeam, redTeam, gameMode, averageRank);
        console.log(`✅ [Predictions] Success on attempt ${attemptCount}!`);
        return { success: true, response, blueTeam, redTeam };
      } catch (err: any) {
        console.warn(`⚠️ [Predictions] Attempt ${attemptCount} failed:`, err.message);

        // Check if it's a rate limit error
        if (err.status === 429 || err.message.includes('rate limit') || err.message.includes('Too Many Requests')) {
          console.error('⚠️ [Predictions] Rate limit hit, stopping retries');
          return { success: false, error: 'Rate limit reached. Please try again later.' };
        }

        // Check if it's a 404 (champion not found) - we can retry
        if (err.status === 404 || err.message.includes('not found')) {
          const championMatch = err.message.match(/Champion '([^']+)' not found/);
          const notFoundChampion = championMatch ? championMatch[1] : 'unknown';

          console.log(`❌ [Predictions] Champion '${notFoundChampion}' not found`);

          // Try next combination
          const nextCombination = getNextCombination(blueIndices, redIndices, blueVariations, redVariations);

          if (nextCombination) {
            return await tryNextCombination(nextCombination.blueIndices, nextCombination.redIndices);
          } else {
            return { success: false, error: `Could not resolve champion names after ${attemptCount} attempts. Last failed champion: '${notFoundChampion}'` };
          }
        }

        // Other errors (network, server, etc.) - don't retry
        console.error('❌ [Predictions] Non-retryable error:', err);
        return { success: false, error: err.message };
      }
    };

    // Helper to get next combination
    const getNextCombination = (
      blueIndices: number[],
      redIndices: number[],
      blueVars: string[][],
      redVars: string[][]
    ): { blueIndices: number[]; redIndices: number[] } | null => {
      // Try incrementing blue team indices first
      const newBlueIndices = [...blueIndices];
      for (let i = newBlueIndices.length - 1; i >= 0; i--) {
        if (newBlueIndices[i] < blueVars[i].length - 1) {
          newBlueIndices[i]++;
          return { blueIndices: newBlueIndices, redIndices };
        } else {
          newBlueIndices[i] = 0;
        }
      }

      // If all blue combinations exhausted, try next red combination
      const newRedIndices = [...redIndices];
      for (let i = newRedIndices.length - 1; i >= 0; i--) {
        if (newRedIndices[i] < redVars[i].length - 1) {
          newRedIndices[i]++;
          return { blueIndices: Array(blueIndices.length).fill(0), redIndices: newRedIndices };
        } else {
          newRedIndices[i] = 0;
        }
      }

      // All combinations exhausted
      return null;
    };

    // Start with all indices at 0 (first variation for each champion)
    const initialBlueIndices = Array(blueTeamOriginal.length).fill(0);
    const initialRedIndices = Array(redTeamOriginal.length).fill(0);

    return await tryNextCombination(initialBlueIndices, initialRedIndices);
  };

  // Generate champion name variations
  const getChampionNameVariations = (championName: string): string[] => {
    console.log('🔍 [Predictions] Generating variations for:', championName);
    const variations: string[] = [];

    // 1. Original name
    variations.push(championName);

    // 2. Remove all spaces and special characters (ChoGath, KhaZix)
    const noSpaces = championName.replace(/[\s'.-]/g, '');
    if (noSpaces !== championName) {
      variations.push(noSpaces);
    }

    // 3. Add space before capital letters (Cho Gath, Kha Zix)
    const withSpaces = championName.replace(/([a-z])([A-Z])/g, '$1 $2');
    if (withSpaces !== championName && !variations.includes(withSpaces)) {
      variations.push(withSpaces);
    }

    // 4. Add apostrophe before capital letters (Cho'Gath, Kha'Zix)
    const withApostrophe = championName.replace(/([a-z])([A-Z])/g, "$1'$2");
    if (withApostrophe !== championName && !variations.includes(withApostrophe)) {
      variations.push(withApostrophe);
    }

    // 5. If name has spaces, try without spaces
    if (championName.includes(' ')) {
      const noSpace = championName.replace(/\s+/g, '');
      if (!variations.includes(noSpace)) {
        variations.push(noSpace);
      }
    }

    // 6. If name has apostrophe, try without it
    if (championName.includes("'")) {
      const noApostrophe = championName.replace(/'/g, '');
      if (!variations.includes(noApostrophe)) {
        variations.push(noApostrophe);
      }
    }

    console.log('✨ [Predictions] Generated variations:', variations);
    return variations;
  };

  const clearTeams = () => {
    setBlueTeam([]);
    setRedTeam([]);
    setPrediction(null);
  };

  const fillRandomTeam = async (team: 'blue' | 'red' | 'both') => {
    // If champions aren't loaded, try loading them first
    if (!championsLoaded || Object.keys(champions).length === 0) {
      setError('Loading champions, please wait...');
      await loadChampions();
      
      // Check again after loading
      if (Object.keys(champions).length === 0) {
        setError('Failed to load champions. Please try again.');
        return;
      }
    }
    
    const championNames = Object.values(champions).map((champ: any) => champ.name);
    
    if (championNames.length < 5) {
      setError('Not enough champions loaded to create random teams');
      return;
    }

    const getRandomChampions = (count: number, exclude: string[] = []): string[] => {
      const available = championNames.filter(name => !exclude.includes(name));
      const shuffled = [...available].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, count);
    };

    if (team === 'red') {
      const randomRed = getRandomChampions(5, blueTeam);
      setRedTeam(randomRed);
    } else if (team === 'both') {
      const randomBlue = getRandomChampions(5);
      const randomRed = getRandomChampions(5, randomBlue);
      setBlueTeam(randomBlue);
      setRedTeam(randomRed);
    }
    
    setError(null); // Clear error on success
    setPrediction(null); // Clear previous prediction
  };

  // Filter winrates based on search term
  const filteredWinrates = winrates.filter(champion =>
    champion.name.toLowerCase().includes(winrateSearch.toLowerCase()) ||
    champion.title.toLowerCase().includes(winrateSearch.toLowerCase()) ||
    champion.tags.some(tag => tag.toLowerCase().includes(winrateSearch.toLowerCase()))
  );

  return (
    <div className="predictions-page">
      <div className="predictions-header">
        <div className="header-content">
          <button onClick={onBack} className="back-button">
            Back to Dashboard
          </button>
          <div className="header-center">
            <h2>🔮 Match Predictions & Analytics</h2>
            <p>{userData?.gameName}#{userData?.tagLine}</p>
          </div>
          <div className="header-spacer"></div>
        </div>
      </div>

      <div className="predictions-tabs">
        <div className="predictions-tabs-container">
          <button
            className={`tab-button ${activeTab === 'winrates' ? 'active' : ''}`}
            onClick={() => setActiveTab('winrates')}
          >
            Champion Winrates
          </button>
          <button
            className={`tab-button ${activeTab === 'predictions' ? 'active' : ''}`}
            onClick={() => setActiveTab('predictions')}
          >
            Match Predictions
          </button>
        </div>
      </div>

      <div className="predictions-content">
        {loading && (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading {activeTab === 'winrates' ? 'champion winrates' : 'match prediction'}...</p>
          </div>
        )}

        {error && (
          <div className="error-state">
            <p>{error}</p>
            <button onClick={() => activeTab === 'winrates' ? loadWinrates() : predictMatch()}>
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {activeTab === 'winrates' && (
              <div className="winrates-section">
                <div className="winrates-controls">
                  <div className="winrates-search-row">
                    <div className="winrates-search">
                      <input
                        type="text"
                        placeholder="Search champions..."
                        value={winrateSearch}
                        onChange={(e) => setWinrateSearch(e.target.value)}
                        className="winrate-search-input"
                      />
                    </div>

                    {hasMoreChampions && (
                      <button
                        onClick={loadMoreWinrates}
                        disabled={loadingMore}
                        className="load-more-button"
                      >
                        {loadingMore ? (
                          <>
                            <div className="loading-spinner-small"></div>
                            Loading...
                          </>
                        ) : (
                          `Load More (${currentLimit}+)`
                        )}
                      </button>
                    )}
                  </div>


                  <div className="winrates-filters">
                    <div className="filter-group">
                      <label>Rank:</label>
                      <select value={rank} onChange={(e) => setRank(e.target.value)}>
                        <option value="ALL">All Ranks</option>
                        <option value="IRON">Iron</option>
                        <option value="BRONZE">Bronze</option>
                        <option value="SILVER">Silver</option>
                        <option value="GOLD">Gold</option>
                        <option value="PLATINUM">Platinum</option>
                        <option value="DIAMOND">Diamond</option>
                        <option value="MASTER">Master+</option>
                      </select>
                    </div>
                    <div className="filter-group">
                      <label>Sort by:</label>
                      <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                        <option value="name">Name (A-Z)</option>
                        <option value="win_rate">Win Rate</option>
                        <option value="pick_rate">Pick Rate</option>
                        <option value="ban_rate">Ban Rate</option>
                        <option value="games_played">Games Played</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="winrates-results-info">
                  <span className="results-count">
                    Showing {filteredWinrates.length} of {winrates.length} champions loaded
                    {winrateSearch && ` for "${winrateSearch}"`}
                    {hasMoreChampions && !winrateSearch && (
                      <span className="more-available"> • More available</span>
                    )}
                  </span>
                </div>

                <div className="winrates-table">
                  <div className="table-header">
                    <div className="table-cell">Champion</div>
                    <div className="table-cell">Win Rate</div>
                    <div className="table-cell">Pick Rate</div>
                    <div className="table-cell">Ban Rate</div>
                    <div className="table-cell">Games</div>
                  </div>
                  {filteredWinrates.length > 0 ? filteredWinrates.map((champion, index) => (
                    <div key={champion.champion_id} className={`table-row ${index % 2 === 0 ? 'even' : 'odd'}`}>
                      <div className="table-cell champion-cell">
                        <img
                          src={`https://ddragon.leagueoflegends.com/cdn/14.22.1/img/champion/${champion.champion_id}.png`}
                          alt={champion.name}
                          className="champion-icon"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/champion-placeholder.png';
                          }}
                        />
                        <div className="champion-info">
                          <span className="champion-name">{champion.name}</span>
                          <span className="champion-title">{champion.title}</span>
                        </div>
                      </div>
                      <div className="table-cell">
                        <span className={`win-rate ${champion.win_rate >= 52 ? 'high' : champion.win_rate <= 48 ? 'low' : 'medium'}`}>
                          {champion.win_rate}%
                        </span>
                      </div>
                      <div className="table-cell">{champion.pick_rate}%</div>
                      <div className="table-cell">{champion.ban_rate}%</div>
                      <div className="table-cell">{champion.games_played.toLocaleString()}</div>
                    </div>
                  )) : (
                    <div className="no-results">
                      <div className="no-results-content">
                        <span className="no-results-icon">🔍</span>
                        <span className="no-results-text">
                          {winrateSearch
                            ? `No champions found matching "${winrateSearch}"`
                            : 'No champions available'
                          }
                        </span>
                        {winrateSearch && (
                          <button
                            onClick={() => setWinrateSearch('')}
                            className="clear-search-button"
                          >
                            Clear Search
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'predictions' && (
              <div className="predictions-section">
                <div className="team-builder">
                  <div className="team-builder-header">
                    <h3>Team Composition Builder</h3>
                    <div className="match-settings">
                      <div className="setting-group">
                        <label>Game Mode:</label>
                        <select value={gameMode} onChange={(e) => setGameMode(e.target.value)}>
                          <option value="CLASSIC">Classic (Summoner's Rift)</option>
                          <option value="ARAM">ARAM</option>
                        </select>
                      </div>
                      <div className="setting-group">
                        <label>Average Rank:</label>
                        <select value={averageRank} onChange={(e) => setAverageRank(e.target.value)}>
                          <option value="IRON">Iron</option>
                          <option value="BRONZE">Bronze</option>
                          <option value="SILVER">Silver</option>
                          <option value="GOLD">Gold</option>
                          <option value="PLATINUM">Platinum</option>
                          <option value="DIAMOND">Diamond</option>
                          <option value="MASTER+">Master+</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="champion-search">
                    <div className="search-controls">
                      <input
                        type="text"
                        placeholder="Search champions..."
                        value={championSearch}
                        onChange={(e) => {
                          setChampionSearch(e.target.value);
                          searchChampions(e.target.value);
                        }}
                        className="champion-search-input"
                      />
                      <div className="team-selector">
                        <button
                          className={`team-button ${selectedTeam === 'blue' ? 'active blue' : 'blue'}`}
                          onClick={() => setSelectedTeam('blue')}
                        >
                          Add to Blue Team
                        </button>
                        <button
                          className={`team-button ${selectedTeam === 'red' ? 'active red' : 'red'}`}
                          onClick={() => setSelectedTeam('red')}
                        >
                          Add to Red Team
                        </button>
                      </div>
                    </div>

                    {searchResults.length > 0 && (
                      <div className="search-results">
                        {searchResults.map(championName => (
                          <div
                            key={championName}
                            className="search-result"
                            onClick={() => addChampionToTeam(championName)}
                          >
                            {championName}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="teams-display">
                    <div className="team blue-team">
                      <h4>Blue Team ({blueTeam.length}/5)</h4>
                      <div className="team-champions">
                        {blueTeam.map(championName => (
                          <div key={championName} className="team-champion">
                            <span>{championName}</span>
                            <button onClick={() => removeChampionFromTeam(championName, 'blue')}>×</button>
                          </div>
                        ))}
                        {Array.from({ length: 5 - blueTeam.length }).map((_, index) => (
                          <div key={index} className="team-champion empty">
                            <span>Empty Slot</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="vs-divider">VS</div>

                    <div className="team red-team">
                      <h4>Red Team ({redTeam.length}/5)</h4>
                      <div className="team-champions">
                        {redTeam.map(championName => (
                          <div key={championName} className="team-champion">
                            <span>{championName}</span>
                            <button onClick={() => removeChampionFromTeam(championName, 'red')}>×</button>
                          </div>
                        ))}
                        {Array.from({ length: 5 - redTeam.length }).map((_, index) => (
                          <div key={index} className="team-champion empty">
                            <span>Empty Slot</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="prediction-controls">
                    <button
                      onClick={predictMatch}
                      disabled={blueTeam.length !== 5 || redTeam.length !== 5}
                      className="predict-button"
                    >
                      Predict Match Outcome
                    </button>
                    <button 
                      onClick={() => fillRandomTeam('red')} 
                      className="random-button"
                      disabled={loading || !championsLoaded}
                      title={!championsLoaded ? 'Loading champions...' : 'Fill red team with random champions'}
                    >
                      {!championsLoaded ? '⏳ Loading...' : '🎲 Random Red Team'}
                    </button>
                    <button 
                      onClick={() => fillRandomTeam('both')} 
                      className="random-button"
                      disabled={loading || !championsLoaded}
                      title={!championsLoaded ? 'Loading champions...' : 'Fill both teams with random champions'}
                    >
                      {!championsLoaded ? '⏳ Loading...' : '🎲 Random Both Teams'}
                    </button>
                    <button onClick={clearTeams} className="clear-button">
                      Clear Teams
                    </button>
                  </div>
                </div>

                {prediction && (
                  <div className="prediction-results">
                    <div className="prediction-header">
                      <h3>Match Prediction Results</h3>
                      <div className="prediction-summary">
                        <div className="win-probabilities">
                          <div className="probability blue">
                            <span className="team-name">Blue Team</span>
                            <span className="percentage">{prediction.prediction.blue_team_win_probability}%</span>
                          </div>
                          <div className="probability red">
                            <span className="team-name">Red Team</span>
                            <span className="percentage">{prediction.prediction.red_team_win_probability}%</span>
                          </div>
                        </div>
                        <div className="predicted-winner">
                          <strong>Predicted Winner: {prediction.prediction.predicted_winner}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="team-analysis">
                      <div className="analysis-section">
                        <h4>Blue Team Analysis</h4>
                        <div className="team-stats">
                          <div className="stat-item">
                            <span>Attack: {prediction.team_analysis.blue_team.composition_score.attack}</span>
                          </div>
                          <div className="stat-item">
                            <span>Defense: {prediction.team_analysis.blue_team.composition_score.defense}</span>
                          </div>
                          <div className="stat-item">
                            <span>Magic: {prediction.team_analysis.blue_team.composition_score.magic}</span>
                          </div>
                          <div className="stat-item">
                            <span>Synergy: {prediction.team_analysis.blue_team.composition_score.synergy}</span>
                          </div>
                        </div>
                        <div className="strengths-weaknesses">
                          {prediction.team_analysis.blue_team.strengths.length > 0 && (
                            <div className="strengths">
                              <h5>Strengths:</h5>
                              <ul>
                                {prediction.team_analysis.blue_team.strengths.map((strength: string, index: number) => (
                                  <li key={index}>{strength}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {prediction.team_analysis.blue_team.weaknesses.length > 0 && (
                            <div className="weaknesses">
                              <h5>Weaknesses:</h5>
                              <ul>
                                {prediction.team_analysis.blue_team.weaknesses.map((weakness: string, index: number) => (
                                  <li key={index}>{weakness}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="analysis-section">
                        <h4>Red Team Analysis</h4>
                        <div className="team-stats">
                          <div className="stat-item">
                            <span>Attack: {prediction.team_analysis.red_team.composition_score.attack}</span>
                          </div>
                          <div className="stat-item">
                            <span>Defense: {prediction.team_analysis.red_team.composition_score.defense}</span>
                          </div>
                          <div className="stat-item">
                            <span>Magic: {prediction.team_analysis.red_team.composition_score.magic}</span>
                          </div>
                          <div className="stat-item">
                            <span>Synergy: {prediction.team_analysis.red_team.composition_score.synergy}</span>
                          </div>
                        </div>
                        <div className="strengths-weaknesses">
                          {prediction.team_analysis.red_team.strengths.length > 0 && (
                            <div className="strengths">
                              <h5>Strengths:</h5>
                              <ul>
                                {prediction.team_analysis.red_team.strengths.map((strength: string, index: number) => (
                                  <li key={index}>{strength}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {prediction.team_analysis.red_team.weaknesses.length > 0 && (
                            <div className="weaknesses">
                              <h5>Weaknesses:</h5>
                              <ul>
                                {prediction.team_analysis.red_team.weaknesses.map((weakness: string, index: number) => (
                                  <li key={index}>{weakness}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="disclaimer">
                      <p>{prediction.disclaimer}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};