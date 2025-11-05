import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { cache, CACHE_KEYS } from '../utils/cache';

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

  useEffect(() => {
    // Load champions on mount (check cache first)
    loadChampions();

    // Load winrates if on winrates tab
    if (activeTab === 'winrates') {
      loadWinrates(100);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'winrates') {
      // Reset limit when filters change
      setCurrentLimit(100);
      setHasMoreChampions(true);
      loadWinrates(100);
    }
  }, [rank, sortBy]);

  const loadChampions = async () => {
    if (championsLoaded) return; // Skip if already loaded in this session

    // Check persistent cache first
    const cachedChampions = cache.get<Record<string, any>>(CACHE_KEYS.CHAMPIONS);
    if (cachedChampions) {
      console.log('📋 Using cached champions data');
      setChampions(cachedChampions);
      setChampionsLoaded(true);
      return;
    }

    try {
      console.log('🔄 Loading champions from API...');
      const response = await apiService.getChampions();
      console.log('✅ Champions loaded:', response);

      const championsData = response.champions || {};
      setChampions(championsData);
      setChampionsLoaded(true);

      // Cache for 60 minutes
      cache.set(CACHE_KEYS.CHAMPIONS, championsData, 60);
    } catch (err: any) {
      console.error('❌ Failed to load champions:', err);
    }
  };

  const loadWinrates = async (limit: number = currentLimit) => {
    const cacheKey = CACHE_KEYS.WINRATES(rank, sortBy) + `_${limit}`;

    // Check persistent cache first
    const cachedWinrates = cache.get<ChampionWinrate[]>(cacheKey);
    if (cachedWinrates) {
      console.log('📋 Using cached winrates data for:', cacheKey);
      setWinrates(cachedWinrates);
      setHasMoreChampions(cachedWinrates.length >= limit);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Loading winrates from API...');
      const response = await apiService.getChampionWinrates(rank, 'ALL', sortBy, limit);
      console.log('✅ Winrates loaded:', response);

      let championsList = response.champions || [];

      // Always sort alphabetically first, then by selected criteria
      if (sortBy === 'name') {
        championsList.sort((a: ChampionWinrate, b: ChampionWinrate) => a.name.localeCompare(b.name));
      } else {
        // Sort by criteria, then alphabetically for ties
        championsList.sort((a: ChampionWinrate, b: ChampionWinrate) => {
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

      setWinrates(championsList);
      setHasMoreChampions(championsList.length >= limit);

      // Cache for 15 minutes (winrates change more frequently)
      cache.set(cacheKey, championsList, 15);
    } catch (err: any) {
      console.error('❌ Failed to load winrates:', err);
      setError(`Failed to load champion winrates: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreWinrates = async () => {
    const newLimit = currentLimit + 100;
    setLoadingMore(true);

    try {
      console.log(`🔄 Loading more winrates (${newLimit} total)...`);
      const response = await apiService.getChampionWinrates(rank, 'ALL', sortBy, newLimit);
      console.log('✅ More winrates loaded:', response);

      let championsList = response.champions || [];

      // Apply same sorting logic
      if (sortBy === 'name') {
        championsList.sort((a: ChampionWinrate, b: ChampionWinrate) => a.name.localeCompare(b.name));
      } else {
        championsList.sort((a: ChampionWinrate, b: ChampionWinrate) => {
          const aValue = a[sortBy as keyof ChampionWinrate];
          const bValue = b[sortBy as keyof ChampionWinrate];

          if (aValue === bValue) {
            return a.name.localeCompare(b.name);
          }

          if (sortBy === 'games_played') {
            return (bValue as number) - (aValue as number);
          } else {
            return (bValue as number) - (aValue as number);
          }
        });
      }

      setWinrates(championsList);
      setCurrentLimit(newLimit);
      setHasMoreChampions(championsList.length >= newLimit);

      // Update cache with new data
      const cacheKey = CACHE_KEYS.WINRATES(rank, sortBy) + `_${newLimit}`;
      cache.set(cacheKey, championsList, 15);

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
      const response = await apiService.getMatchOutcome(blueTeam, redTeam, gameMode, averageRank);
      setPrediction(response);
    } catch (err: any) {
      console.error('Failed to predict match:', err);
      setError(`Failed to predict match outcome: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const clearTeams = () => {
    setBlueTeam([]);
    setRedTeam([]);
    setPrediction(null);
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