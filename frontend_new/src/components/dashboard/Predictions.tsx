import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { storage } from '../../utils/storage';
import { cache, CACHE_KEYS } from '../../utils/cache';
import { getChampions } from '../../services/championCache';
import { LoadingSpinner } from '@/components/ui-retro/LoadingSpinner';

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

  useEffect(() => {
    // Load champions only for predictions tab (needed for team builder)
    if (activeTab === 'predictions') {
      loadChampions();
    }

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
    const filteredChampions = [...allChampions];

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
    <div>

      <div className="mb-4">
        <div className="relative flex flex-wrap items-center gap-2 p-2 rounded-sm border border-border bg-gradient-panel shadow-bevel">
          <span className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
          {([
            { id: 'winrates', label: 'Champion Winrates' },
            { id: 'predictions', label: 'Match Predictions' },
          ] as const).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={[
                  "group relative inline-flex items-center gap-2 px-4 py-2 rounded-sm",
                  "font-display text-xs uppercase tracking-[0.18em]",
                  "border transition-all duration-200",
                  "before:absolute before:inset-0 before:rounded-[inherit] before:bg-sheen before:pointer-events-none before:opacity-60",
                  isActive
                    ? "bg-gradient-coral text-primary-foreground border-primary/80 shadow-halo"
                    : "bg-surface-inset/70 text-ink/75 border-border hover:text-primary hover:border-primary/60 hover:bg-surface-raised/60",
                ].join(" ")}
              >
                <span
                  aria-hidden
                  className={[
                    "relative z-10 inline-block h-1.5 w-1.5 rotate-45",
                    isActive ? "bg-primary-foreground shadow-[0_0_6px_hsl(var(--primary-foreground)/0.8)]" : "bg-primary/70 group-hover:bg-primary",
                  ].join(" ")}
                />
                <span className="relative z-10 drop-shadow-[0_1px_0_hsl(277_50%_8%/0.6)]">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center text-ink/80">
            <LoadingSpinner />
            <p className="font-display text-sm">Loading {activeTab === 'winrates' ? 'champion winrates' : 'match prediction'}...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <p className="font-display text-sm text-secondary">{error}</p>
            <button
              onClick={() => activeTab === 'winrates' ? loadWinrates() : predictMatch()}
              className="px-4 py-2 rounded-sm border border-primary/70 bg-surface-inset text-primary font-display text-xs uppercase tracking-[0.18em] hover:bg-primary/10 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {activeTab === 'winrates' && (
              <div className="flex flex-col gap-4">
                {/* Controls card */}
                <div className="panel-bevel rounded-sm p-4 flex flex-col gap-4">
                  {/* Search row */}
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch">
                    <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-sm border-2 border-primary/70 bg-surface-inset shadow-[0_0_24px_hsl(10_96%_70%/0.35)]">
                      <span className="text-primary/80 font-display text-sm">⌕</span>
                      <input
                        type="text"
                        placeholder="Search champions..."
                        value={winrateSearch}
                        onChange={(e) => setWinrateSearch(e.target.value)}
                        className="flex-1 bg-transparent outline-none border-0 font-display text-sm text-ink placeholder:text-muted-foreground/60"
                      />
                    </div>

                    {hasMoreChampions && (
                      <button
                        onClick={loadMoreWinrates}
                        disabled={loadingMore}
                        className="relative inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-sm border border-primary/80 bg-gradient-coral text-primary-foreground font-display text-xs uppercase tracking-[0.18em] shadow-bevel hover:shadow-halo transition-shadow disabled:opacity-60 before:absolute before:inset-0 before:rounded-[inherit] before:bg-sheen before:pointer-events-none before:opacity-60"
                      >
                        {loadingMore ? (
                          <>
                            <span className="h-3 w-3 rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground animate-spin" />
                            <span className="relative z-10">Loading…</span>
                          </>
                        ) : (
                          <span className="relative z-10">Load More ({currentLimit}+)</span>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Filters row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      {
                        label: 'Rank',
                        value: rank,
                        onChange: (v: string) => setRank(v),
                        options: [
                          ['ALL', 'All Ranks'], ['IRON', 'Iron'], ['BRONZE', 'Bronze'],
                          ['SILVER', 'Silver'], ['GOLD', 'Gold'], ['PLATINUM', 'Platinum'],
                          ['DIAMOND', 'Diamond'], ['MASTER', 'Master+'],
                        ],
                      },
                      {
                        label: 'Sort by',
                        value: sortBy,
                        onChange: (v: string) => setSortBy(v),
                        options: [
                          ['name', 'Name (A-Z)'], ['win_rate', 'Win Rate'],
                          ['pick_rate', 'Pick Rate'], ['ban_rate', 'Ban Rate'],
                          ['games_played', 'Games Played'],
                        ],
                      },
                    ].map((f) => (
                      <label key={f.label} className="flex flex-col gap-1.5">
                        <span className="font-pixel text-[10px] uppercase tracking-[0.2em] text-primary/90">
                          {f.label}
                        </span>
                        <div className="flex items-center px-3 py-2 rounded-sm border-2 border-primary/70 bg-surface-inset shadow-[0_0_24px_hsl(10_96%_70%/0.25)] focus-within:border-primary focus-within:shadow-inner-glow">
                          <select
                            value={f.value}
                            onChange={(e) => f.onChange(e.target.value)}
                            className="w-full bg-transparent outline-none border-0 font-display text-sm text-ink appearance-none cursor-pointer"
                          >
                            {f.options.map(([v, l]) => (
                              <option key={v} value={v} className="bg-surface text-ink">
                                {l}
                              </option>
                            ))}
                          </select>
                          <span className="text-primary/80 text-xs ml-2 pointer-events-none">▾</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Results info */}
                <div className="flex items-center gap-2 px-1 font-pixel text-[10px] uppercase tracking-[0.18em] text-ink/70">
                  <span className="inline-block h-1.5 w-1.5 rotate-45 bg-primary shadow-halo" />
                  <span>
                    Showing {filteredWinrates.length} of {winrates.length} champions
                    {winrateSearch && ` for "${winrateSearch}"`}
                    {hasMoreChampions && !winrateSearch && (
                      <span className="text-primary"> • More available</span>
                    )}
                  </span>
                </div>

                {/* Table card */}
                <div className="panel-bevel rounded-sm overflow-hidden">
                  <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-2 px-4 py-3 border-b border-border bg-surface-inset/80 font-display text-[11px] uppercase tracking-[0.18em] text-primary">
                    <div>Champion</div>
                    <div>Win Rate</div>
                    <div>Pick Rate</div>
                    <div>Ban Rate</div>
                    <div>Games</div>
                  </div>
                  {filteredWinrates.length > 0 ? filteredWinrates.map((champion, index) => (
                    <div
                      key={champion.champion_id}
                      className={[
                        "grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-2 items-center px-4 py-2.5 border-b border-border/60 transition-colors",
                        index % 2 === 0 ? "bg-surface-inset/40" : "bg-transparent",
                        "hover:bg-primary/10",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={`https://ddragon.leagueoflegends.com/cdn/14.22.1/img/champion/${champion.champion_id}.png`}
                          alt={champion.name}
                          className="h-9 w-9 rounded-sm border border-primary/40 shadow-bevel object-cover flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/champion-placeholder.png';
                          }}
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="font-blackletter text-sm text-ink truncate">{champion.name}</span>
                          <span className="text-[11px] text-muted-foreground truncate italic">{champion.title}</span>
                        </div>
                      </div>
                      <div>
                        <span
                          className={[
                            "font-pixel text-[11px] px-2 py-1 rounded-sm border",
                            champion.win_rate >= 52
                              ? "text-[#6fd58a] border-[#6fd58a]/40 bg-[#6fd58a]/10"
                              : champion.win_rate <= 48
                              ? "text-secondary border-secondary/50 bg-secondary/10"
                              : "text-gold border-gold/40 bg-gold/10",
                          ].join(" ")}
                        >
                          {champion.win_rate}%
                        </span>
                      </div>
                      <div className="font-display text-sm text-ink/85">{champion.pick_rate}%</div>
                      <div className="font-display text-sm text-ink/85">{champion.ban_rate}%</div>
                      <div className="font-display text-sm text-ink/85">{champion.games_played.toLocaleString()}</div>
                    </div>
                  )) : (
                    <div className="flex flex-col items-center justify-center gap-3 py-12 px-6 text-center">
                      <span className="text-3xl">🔍</span>
                      <span className="font-display text-sm text-ink/80">
                        {winrateSearch
                          ? `No champions found matching "${winrateSearch}"`
                          : 'No champions available'}
                      </span>
                      {winrateSearch && (
                        <button
                          onClick={() => setWinrateSearch('')}
                          className="px-4 py-2 rounded-sm border border-primary/70 bg-surface-inset text-primary font-display text-xs uppercase tracking-[0.18em] hover:bg-primary/10 transition-colors"
                        >
                          Clear Search
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'predictions' && (
              <div className="flex flex-col gap-4">
                {/* Team Builder card */}
                <div className="panel-bevel rounded-sm p-4 flex flex-col gap-5">
                  <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                    <h3 className="font-blackletter text-xl text-primary text-glow m-0">
                      Team Composition Builder
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:min-w-[420px]">
                      {[
                        {
                          label: 'Game Mode',
                          value: gameMode,
                          onChange: setGameMode,
                          options: [
                            ['CLASSIC', "Classic (Summoner's Rift)"],
                            ['ARAM', 'ARAM'],
                          ] as [string, string][],
                        },
                        {
                          label: 'Average Rank',
                          value: averageRank,
                          onChange: setAverageRank,
                          options: [
                            ['IRON', 'Iron'], ['BRONZE', 'Bronze'], ['SILVER', 'Silver'],
                            ['GOLD', 'Gold'], ['PLATINUM', 'Platinum'],
                            ['DIAMOND', 'Diamond'], ['MASTER+', 'Master+'],
                          ] as [string, string][],
                        },
                      ].map((f) => (
                        <label key={f.label} className="flex flex-col gap-1.5">
                          <span className="font-pixel text-[10px] uppercase tracking-[0.2em] text-primary/90">
                            {f.label}
                          </span>
                          <div className="flex items-center px-3 py-2 rounded-sm border-2 border-primary/70 bg-surface-inset shadow-[0_0_24px_hsl(10_96%_70%/0.25)] focus-within:border-primary focus-within:shadow-inner-glow">
                            <select
                              value={f.value}
                              onChange={(e) => f.onChange(e.target.value)}
                              className="w-full bg-transparent outline-none border-0 font-display text-sm text-ink appearance-none cursor-pointer"
                            >
                              {f.options.map(([v, l]) => (
                                <option key={v} value={v} className="bg-surface text-ink">
                                  {l}
                                </option>
                              ))}
                            </select>
                            <span className="text-primary/80 text-xs ml-2 pointer-events-none">▾</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Champion search */}
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-sm border-2 border-primary/70 bg-surface-inset shadow-[0_0_24px_hsl(10_96%_70%/0.35)] focus-within:border-primary focus-within:shadow-inner-glow">
                        <span className="text-primary/80 font-display text-sm">⌕</span>
                        <input
                          type="text"
                          placeholder="Search champions..."
                          value={championSearch}
                          onChange={(e) => {
                            setChampionSearch(e.target.value);
                            searchChampions(e.target.value);
                          }}
                          className="flex-1 bg-transparent outline-none border-0 font-display text-sm text-ink placeholder:text-muted-foreground/60"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedTeam('blue')}
                          className={[
                            "relative px-4 py-2 rounded-sm border font-display text-xs uppercase tracking-[0.18em] transition-all",
                            "before:absolute before:inset-0 before:rounded-[inherit] before:bg-sheen before:pointer-events-none before:opacity-50",
                            selectedTeam === 'blue'
                              ? "bg-[hsl(210_90%_55%)] text-white border-[hsl(210_100%_70%)] shadow-[0_0_18px_hsl(210_100%_60%/0.6)]"
                              : "bg-surface-inset text-ink/80 border-[hsl(210_60%_45%)]/60 hover:text-white hover:border-[hsl(210_100%_70%)]",
                          ].join(" ")}
                        >
                          <span className="relative z-10">Add to Blue</span>
                        </button>
                        <button
                          onClick={() => setSelectedTeam('red')}
                          className={[
                            "relative px-4 py-2 rounded-sm border font-display text-xs uppercase tracking-[0.18em] transition-all",
                            "before:absolute before:inset-0 before:rounded-[inherit] before:bg-sheen before:pointer-events-none before:opacity-50",
                            selectedTeam === 'red'
                              ? "bg-gradient-coral text-primary-foreground border-primary/80 shadow-halo"
                              : "bg-surface-inset text-ink/80 border-secondary/60 hover:text-primary hover:border-primary",
                          ].join(" ")}
                        >
                          <span className="relative z-10">Add to Red</span>
                        </button>
                      </div>
                    </div>

                    {searchResults.length > 0 && (
                      <div className="panel-bevel rounded-sm p-2 max-h-48 overflow-y-auto flex flex-col gap-1">
                        {searchResults.map((championName) => (
                          <div
                            key={championName}
                            className="px-3 py-1.5 rounded-sm font-display text-sm text-ink/90 cursor-pointer hover:bg-primary/15 hover:text-primary transition-colors"
                            onClick={() => addChampionToTeam(championName)}
                          >
                            {championName}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Teams display */}
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-stretch">
                    {([
                      { side: 'blue' as const, list: blueTeam, label: 'Blue Team', accent: 'hsl(210_100%_70%)', glow: 'hsl(210_100%_60%/0.5)' },
                      { side: 'red' as const, list: redTeam, label: 'Red Team', accent: 'hsl(10_96%_70%)', glow: 'hsl(10_96%_70%/0.55)' },
                    ] as const).map((team, idx) => (
                      <React.Fragment key={team.side}>
                        {idx === 1 && (
                          <div className="hidden md:flex items-center justify-center font-blackletter text-2xl text-primary text-glow">
                            VS
                          </div>
                        )}
                        <div
                          className="panel-bevel rounded-sm p-4 flex flex-col gap-3"
                          style={{ boxShadow: `var(--shadow-bevel), 0 0 22px ${team.glow.replace(/_/g, ' ')}` }}
                        >
                          <h4
                            className="font-blackletter text-lg m-0"
                            style={{ color: `hsl(${team.accent.replace(/_/g, ' ')})` }}
                          >
                            {team.label} ({team.list.length}/5)
                          </h4>
                          <div className="flex flex-col gap-1.5">
                            {team.list.map((championName) => (
                              <div
                                key={championName}
                                className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-sm bg-surface-inset/70 border border-border"
                              >
                                <span className="font-display text-sm text-ink truncate">{championName}</span>
                                <button
                                  onClick={() => removeChampionFromTeam(championName, team.side)}
                                  className="h-6 w-6 inline-flex items-center justify-center rounded-sm border border-border text-ink/70 hover:text-secondary hover:border-secondary transition-colors"
                                  aria-label="Remove"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                            {Array.from({ length: 5 - team.list.length }).map((_, i) => (
                              <div
                                key={i}
                                className="px-3 py-1.5 rounded-sm border border-dashed border-border/60 bg-surface-inset/30 font-display text-xs italic text-muted-foreground"
                              >
                                Empty Slot
                              </div>
                            ))}
                          </div>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 justify-center">
                    <button
                      onClick={predictMatch}
                      disabled={blueTeam.length !== 5 || redTeam.length !== 5}
                      className="relative inline-flex items-center gap-2 px-5 py-2.5 rounded-sm border border-primary/80 bg-gradient-coral text-primary-foreground font-display text-xs uppercase tracking-[0.18em] shadow-bevel hover:shadow-halo transition-shadow disabled:opacity-50 disabled:cursor-not-allowed before:absolute before:inset-0 before:rounded-[inherit] before:bg-sheen before:pointer-events-none before:opacity-60"
                    >
                      <span className="relative z-10">⚔ Predict Outcome</span>
                    </button>
                    <button
                      onClick={() => fillRandomTeam('red')}
                      disabled={loading || !championsLoaded}
                      title={!championsLoaded ? 'Loading champions...' : 'Fill red team with random champions'}
                      className="px-4 py-2.5 rounded-sm border border-border bg-surface-inset text-ink/85 font-display text-xs uppercase tracking-[0.18em] hover:text-primary hover:border-primary/70 transition-colors disabled:opacity-50"
                    >
                      {!championsLoaded ? '⏳ Loading...' : '🎲 Random Red'}
                    </button>
                    <button
                      onClick={() => fillRandomTeam('both')}
                      disabled={loading || !championsLoaded}
                      title={!championsLoaded ? 'Loading champions...' : 'Fill both teams with random champions'}
                      className="px-4 py-2.5 rounded-sm border border-border bg-surface-inset text-ink/85 font-display text-xs uppercase tracking-[0.18em] hover:text-primary hover:border-primary/70 transition-colors disabled:opacity-50"
                    >
                      {!championsLoaded ? '⏳ Loading...' : '🎲 Random Both'}
                    </button>
                    <button
                      onClick={clearTeams}
                      className="px-4 py-2.5 rounded-sm border border-secondary/60 bg-surface-inset text-secondary font-display text-xs uppercase tracking-[0.18em] hover:bg-secondary/10 transition-colors"
                    >
                      Clear Teams
                    </button>
                  </div>
                </div>

                {prediction && (
                  <div className="panel-bevel rounded-sm p-5 flex flex-col gap-5">
                    <div className="flex flex-col gap-3">
                      <h3 className="font-blackletter text-xl text-primary text-glow m-0">
                        Match Prediction Results
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-sm p-3 border border-[hsl(210_100%_70%)]/60 bg-[hsl(210_60%_30%)]/25 text-center shadow-[0_0_18px_hsl(210_100%_60%/0.25)]">
                          <div className="font-pixel text-[10px] uppercase tracking-[0.2em] text-[hsl(210_100%_80%)]">Blue Team</div>
                          <div className="font-blackletter text-3xl text-[hsl(210_100%_85%)] mt-1">
                            {prediction.prediction.blue_team_win_probability}%
                          </div>
                        </div>
                        <div className="rounded-sm p-3 border border-primary/70 bg-primary/10 text-center shadow-[0_0_18px_hsl(10_96%_70%/0.3)]">
                          <div className="font-pixel text-[10px] uppercase tracking-[0.2em] text-primary">Red Team</div>
                          <div className="font-blackletter text-3xl text-primary mt-1">
                            {prediction.prediction.red_team_win_probability}%
                          </div>
                        </div>
                      </div>
                      <div className="text-center font-display text-base text-ink">
                        <span className="font-pixel text-[10px] uppercase tracking-[0.2em] text-primary/80 mr-2">Predicted Winner:</span>
                        <strong className="font-blackletter text-lg text-glow">{prediction.prediction.predicted_winner}</strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {([
                        { key: 'blue_team' as const, label: 'Blue Team Analysis', accent: 'hsl(210_100%_75%)' },
                        { key: 'red_team' as const, label: 'Red Team Analysis', accent: 'hsl(10_96%_70%)' },
                      ]).map((side) => {
                        const data = prediction.team_analysis[side.key];
                        return (
                          <div key={side.key} className="rounded-sm border border-border bg-surface-inset/40 p-4 flex flex-col gap-3">
                            <h4
                              className="font-blackletter text-base m-0"
                              style={{ color: `hsl(${side.accent.replace(/_/g, ' ')})` }}
                            >
                              {side.label}
                            </h4>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                ['Attack', data.composition_score.attack],
                                ['Defense', data.composition_score.defense],
                                ['Magic', data.composition_score.magic],
                                ['Synergy', data.composition_score.synergy],
                              ].map(([label, val]) => (
                                <div key={label as string} className="flex items-center justify-between px-2.5 py-1.5 rounded-sm bg-background/50 border border-border/70">
                                  <span className="font-pixel text-[9px] uppercase tracking-[0.18em] text-ink/70">{label}</span>
                                  <span className="font-display text-sm text-primary">{val as number}</span>
                                </div>
                              ))}
                            </div>
                            {data.strengths.length > 0 && (
                              <div>
                                <h5 className="font-pixel text-[10px] uppercase tracking-[0.2em] text-[#6fd58a] mb-1.5">◆ Strengths</h5>
                                <ul className="list-none p-0 m-0 flex flex-col gap-1">
                                  {data.strengths.map((s: string, i: number) => (
                                    <li key={i} className="text-sm text-ink/85 pl-3 relative before:content-['▸'] before:absolute before:left-0 before:text-[#6fd58a]">{s}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {data.weaknesses.length > 0 && (
                              <div>
                                <h5 className="font-pixel text-[10px] uppercase tracking-[0.2em] text-secondary mb-1.5">◆ Weaknesses</h5>
                                <ul className="list-none p-0 m-0 flex flex-col gap-1">
                                  {data.weaknesses.map((w: string, i: number) => (
                                    <li key={i} className="text-sm text-ink/85 pl-3 relative before:content-['▸'] before:absolute before:left-0 before:text-secondary">{w}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <p className="text-xs italic text-muted-foreground text-center m-0">{prediction.disclaimer}</p>
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