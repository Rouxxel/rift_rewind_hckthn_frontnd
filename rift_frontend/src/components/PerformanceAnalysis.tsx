import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { storage } from '../utils/storage';
import { cache, CACHE_KEYS } from '../utils/cache';

interface PerformanceAnalysisProps {
  onBack: () => void;
}

interface ChampionMastery {
  championId: number;
  championLevel: number;
  championPoints: number;
  championName?: string;
  lastPlayTime: number;
  chestGranted: boolean;
  tokensEarned: number;
}

interface SummonerSpellsResponse {
  puuid: string;
  region: string;
  champion_filter: string | null;
  matches_analyzed: number;
  overall_stats: {
    most_used_combinations: Record<string, number>;
    spell_effectiveness: Record<string, { games: number; wins: number; win_rate: number }>;
  };
  champion_breakdown: Record<string, Record<string, { games: number; wins: number; win_rate: number }>>;
  role_breakdown: Record<string, Record<string, { games: number; wins: number; win_rate: number }>>;
}

interface RuneMasteriesResponse {
  puuid: string;
  region: string;
  champion_filter: string | null;
  matches_analyzed: number;
  overall_stats: {
    most_used_primary_trees: Record<string, number>;
    most_used_secondary_trees: Record<string, number>;
    most_used_keystones: Record<number, number>;
  };
  champion_breakdown: Record<string, {
    games_played: number;
    primary_trees: Record<string, number>;
    secondary_trees: Record<string, number>;
    keystones: Record<number, number>;
  }>;
}

interface PlayerPerformance {
  puuid: string;
  region: string;
  queue_type: string;
  matches_analyzed: number;
  overall_performance: {
    win_rate: number;
    avg_kda: number;
    median_kda: number;
    avg_cs_per_min: number;
    avg_damage_per_min: number;
    avg_gold_per_min: number;
    avg_kill_participation: number;
    avg_vision_score: number;
  };
  performance_trends: {
    recent_5_games: {
      win_rate: number;
      avg_kda: number;
    };
    recent_10_games: {
      win_rate: number;
      avg_kda: number;
    };
  };
  champion_stats: {
    most_played: Record<string, number>;
    total_unique_champions: number;
  };
  role_distribution: Record<string, number>;
  detailed_matches: Array<{
    match_id: string;
    champion: string;
    role: string;
    kda: number;
    cs_per_min: number;
    damage_per_min: number;
    gold_per_min: number;
    vision_score: number;
    kill_participation: number;
    game_duration: number;
    win: boolean;
  }>;
}

export const PerformanceAnalysis: React.FC<PerformanceAnalysisProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'mastery' | 'spells' | 'runes'>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [playerPerformance, setPlayerPerformance] = useState<PlayerPerformance | null>(null);
  const [championMastery, setChampionMastery] = useState<ChampionMastery[]>([]);
  const [summonerSpells, setSummonerSpells] = useState<SummonerSpellsResponse | null>(null);
  const [runeMasteries, setRuneMasteries] = useState<RuneMasteriesResponse | null>(null);

  // User data
  const userData = storage.getUserData();
  const userCredentials = storage.getUserCredentials();

  // Filter states for each tab
  const [masteryFilters, setMasteryFilters] = useState({
    championId: '',
    top: '10',
    totalScore: false
  });

  const [spellsFilters, setSpellsFilters] = useState({
    championName: '',
    matchCount: '15'
  });

  const [runesFilters, setRunesFilters] = useState({
    championName: '',
    matchCount: '10'
  });

  useEffect(() => {
    if (activeTab === 'overview') {
      loadPlayerPerformance();
    }
    // Don't auto-load other tabs - wait for user to click analyze
  }, [activeTab]);

  const loadPlayerPerformance = async () => {
    if (!userData || !userCredentials) return;

    setLoading(true);
    setError(null);

    try {
      const cacheKey = CACHE_KEYS.PLAYER_PERFORMANCE(userData.puuid);
      const cached = cache.get<PlayerPerformance>(cacheKey);

      if (cached) {
        console.log('✅ Using cached player performance:', cached);
        setPlayerPerformance(cached);
      } else {
        console.log('🔄 Loading player performance...');
        const response = await apiService.getPlayerPerformance(userData.puuid, userCredentials.region);
        console.log('✅ Player performance response:', response);
        setPlayerPerformance(response.data || response);
        cache.set(cacheKey, response.data || response, 15);
      }
    } catch (err: any) {
      console.error('❌ Failed to load player performance:', err);
      setError(`Failed to load performance data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadChampionMastery = async () => {
    if (!userData || !userCredentials) return;

    setLoading(true);
    setError(null);

    try {
      const championId = masteryFilters.championId ? parseInt(masteryFilters.championId) : undefined;
      const top = masteryFilters.top ? parseInt(masteryFilters.top) : undefined;
      
      console.log('🔄 Loading champion mastery with filters:', { championId, top, totalScore: masteryFilters.totalScore });
      const response = await apiService.getChampionMastery(
        userData.puuid, 
        userCredentials.region,
        championId,
        top,
        masteryFilters.totalScore
      );
      console.log('✅ Champion mastery response:', response);
      
      const masteryData = response.mastery_data || response.data?.mastery_data || [];
      setChampionMastery(Array.isArray(masteryData) ? masteryData : [masteryData]);
    } catch (err: any) {
      console.error('❌ Failed to load champion mastery:', err);
      setError(`Failed to load champion mastery: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadSummonerSpells = async () => {
    if (!userData || !userCredentials) return;

    setLoading(true);
    setError(null);

    try {
      const championName = spellsFilters.championName || undefined;
      const matchCount = spellsFilters.matchCount ? parseInt(spellsFilters.matchCount) : undefined;
      
      console.log('🔄 Loading summoner spells analysis with filters:', { championName, matchCount });
      const response = await apiService.getSummonerSpellsAnalysis(
        userData.puuid,
        userCredentials.region,
        championName,
        matchCount
      );
      console.log('✅ Summoner spells response:', response);
      setSummonerSpells(response);
    } catch (err: any) {
      console.error('❌ Failed to load summoner spells:', err);
      setError(`Failed to load summoner spells: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadRuneMasteries = async () => {
    if (!userData || !userCredentials) return;

    setLoading(true);
    setError(null);

    try {
      const championName = runesFilters.championName || undefined;
      const matchCount = runesFilters.matchCount ? parseInt(runesFilters.matchCount) : undefined;
      
      console.log('🔄 Loading rune masteries with filters:', { championName, matchCount });
      const response = await apiService.getRuneMasteries(
        userData.puuid,
        userCredentials.region,
        championName,
        matchCount
      );
      console.log('✅ Rune masteries response:', response);
      setRuneMasteries(response);
    } catch (err: any) {
      console.error('❌ Failed to load rune masteries:', err);
      setError(`Failed to load rune masteries: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  const formatKDA = (kda: number): string => {
    return kda.toFixed(2);
  };

  const formatWinRate = (winRate: number): string => {
    return `${winRate.toFixed(1)}%`;
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="performance-page">
      <div className="performance-header">
        <div className="header-content">
          <button onClick={onBack} className="back-button">
            ← Back to Dashboard
          </button>
          <div className="header-center">
            <h2>🎯 Performance Analysis</h2>
            <p>{userData?.gameName}#{userData?.tagLine}</p>
          </div>
          <div className="header-spacer"></div>
        </div>
      </div>

      <div className="performance-tabs">
        <div className="performance-tabs-container">
          <button
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`tab-button ${activeTab === 'mastery' ? 'active' : ''}`}
            onClick={() => setActiveTab('mastery')}
          >
            Champion Mastery
          </button>
          <button
            className={`tab-button ${activeTab === 'spells' ? 'active' : ''}`}
            onClick={() => setActiveTab('spells')}
          >
            Summoner Spells
          </button>
          <button
            className={`tab-button ${activeTab === 'runes' ? 'active' : ''}`}
            onClick={() => setActiveTab('runes')}
          >
            Runes
          </button>
        </div>
      </div>

      <div className="performance-content">
        {loading && (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading {activeTab} data...</p>
          </div>
        )}

        {error && (
          <div className="error-state">
            <p>{error}</p>
            <button onClick={() => {
              if (activeTab === 'overview') loadPlayerPerformance();
              else if (activeTab === 'mastery') loadChampionMastery();
              else if (activeTab === 'spells') loadSummonerSpells();
              else if (activeTab === 'runes') loadRuneMasteries();
            }}>
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {activeTab === 'overview' && playerPerformance && (
              <div className="overview-section">
                <div className="stats-cards">
                  <div className="stat-card">
                    <h3>Overall Performance</h3>
                    <div className="stat-grid">
                      <div className="stat-item">
                        <span className="stat-label">Matches Analyzed</span>
                        <span className="stat-value">{playerPerformance.matches_analyzed}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Win Rate</span>
                        <span className={`stat-value ${playerPerformance.overall_performance.win_rate >= 50 ? 'positive' : 'negative'}`}>
                          {formatWinRate(playerPerformance.overall_performance.win_rate)}
                        </span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Average KDA</span>
                        <span className="stat-value">{formatKDA(playerPerformance.overall_performance.avg_kda)}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Median KDA</span>
                        <span className="stat-value">{formatKDA(playerPerformance.overall_performance.median_kda)}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">CS per Min</span>
                        <span className="stat-value">{playerPerformance.overall_performance.avg_cs_per_min.toFixed(1)}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Damage per Min</span>
                        <span className="stat-value">{formatNumber(Math.round(playerPerformance.overall_performance.avg_damage_per_min))}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Gold per Min</span>
                        <span className="stat-value">{formatNumber(Math.round(playerPerformance.overall_performance.avg_gold_per_min))}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Kill Participation</span>
                        <span className="stat-value">{playerPerformance.overall_performance.avg_kill_participation.toFixed(1)}%</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Vision Score</span>
                        <span className="stat-value">{playerPerformance.overall_performance.avg_vision_score.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="stat-card">
                    <h3>Performance Trends</h3>
                    <div className="trends-grid">
                      <div className="trend-section">
                        <h4>Recent 5 Games</h4>
                        <div className="stat-grid">
                          <div className="stat-item">
                            <span className="stat-label">Win Rate</span>
                            <span className={`stat-value ${playerPerformance.performance_trends.recent_5_games.win_rate >= 50 ? 'positive' : 'negative'}`}>
                              {formatWinRate(playerPerformance.performance_trends.recent_5_games.win_rate)}
                            </span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Avg KDA</span>
                            <span className="stat-value">{formatKDA(playerPerformance.performance_trends.recent_5_games.avg_kda)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="trend-section">
                        <h4>Recent 10 Games</h4>
                        <div className="stat-grid">
                          <div className="stat-item">
                            <span className="stat-label">Win Rate</span>
                            <span className={`stat-value ${playerPerformance.performance_trends.recent_10_games.win_rate >= 50 ? 'positive' : 'negative'}`}>
                              {formatWinRate(playerPerformance.performance_trends.recent_10_games.win_rate)}
                            </span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Avg KDA</span>
                            <span className="stat-value">{formatKDA(playerPerformance.performance_trends.recent_10_games.avg_kda)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="stats-cards">
                  <div className="stat-card">
                    <h3>Champion Statistics</h3>
                    <div className="stat-grid">
                      <div className="stat-item">
                        <span className="stat-label">Unique Champions</span>
                        <span className="stat-value">{playerPerformance.champion_stats.total_unique_champions}</span>
                      </div>
                    </div>
                    <div className="most-played-section">
                      <h4>Most Played Champions</h4>
                      <div className="most-played-list">
                        {Object.entries(playerPerformance.champion_stats.most_played).map(([champion, games], index) => (
                          <div key={index} className="most-played-item">
                            <span className="champion-name">{champion}</span>
                            <span className="games-count">{games} games</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="stat-card">
                    <h3>Role Distribution</h3>
                    <div className="role-distribution-list">
                      {Object.entries(playerPerformance.role_distribution)
                        .sort(([, a], [, b]) => b - a)
                        .map(([role, count], index) => (
                          <div key={index} className="role-item">
                            <span className="role-name">{role}</span>
                            <div className="role-bar-container">
                              <div 
                                className="role-bar" 
                                style={{ width: `${(count / playerPerformance.matches_analyzed) * 100}%` }}
                              ></div>
                            </div>
                            <span className="role-count">{count} games</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                {playerPerformance.detailed_matches.length > 0 && (
                  <div className="detailed-matches-section">
                    <h3>Recent Matches</h3>
                    <div className="performance-table">
                      <div className="table-header">
                        <div className="table-cell">Champion</div>
                        <div className="table-cell">Role</div>
                        <div className="table-cell">KDA</div>
                        <div className="table-cell">CS/min</div>
                        <div className="table-cell">DMG/min</div>
                        <div className="table-cell">Gold/min</div>
                        <div className="table-cell">Vision</div>
                        <div className="table-cell">KP%</div>
                        <div className="table-cell">Result</div>
                      </div>
                      {playerPerformance.detailed_matches.slice(0, 10).map((match, index) => (
                        <div key={index} className={`table-row ${index % 2 === 0 ? 'even' : 'odd'}`}>
                          <div className="table-cell">{match.champion}</div>
                          <div className="table-cell">{match.role}</div>
                          <div className="table-cell">{formatKDA(match.kda)}</div>
                          <div className="table-cell">{match.cs_per_min.toFixed(1)}</div>
                          <div className="table-cell">{Math.round(match.damage_per_min)}</div>
                          <div className="table-cell">{Math.round(match.gold_per_min)}</div>
                          <div className="table-cell">{match.vision_score}</div>
                          <div className="table-cell">{match.kill_participation}%</div>
                          <div className="table-cell">
                            <span className={match.win ? 'positive' : 'negative'}>
                              {match.win ? 'Win' : 'Loss'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'mastery' && (
              <div className="mastery-section">
                <div className="filters-card">
                  <h3>Champion Mastery Filters</h3>
                  <div className="filters-grid">
                    <div className="filter-group">
                      <label>Champion ID (optional):</label>
                      <input
                        type="number"
                        placeholder="e.g., 266 for Aatrox"
                        value={masteryFilters.championId}
                        onChange={(e) => setMasteryFilters({ ...masteryFilters, championId: e.target.value })}
                      />
                    </div>
                    <div className="filter-group">
                      <label>Top N Champions:</label>
                      <select
                        value={masteryFilters.top}
                        onChange={(e) => setMasteryFilters({ ...masteryFilters, top: e.target.value })}
                      >
                        <option value="5">Top 5</option>
                        <option value="10">Top 10</option>
                        <option value="20">Top 20</option>
                        <option value="">All</option>
                      </select>
                    </div>
                    <div className="filter-group checkbox-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={masteryFilters.totalScore}
                          onChange={(e) => setMasteryFilters({ ...masteryFilters, totalScore: e.target.checked })}
                        />
                        Get Total Score Only
                      </label>
                    </div>
                  </div>
                  <button onClick={loadChampionMastery} disabled={loading} className="analyze-button">
                    {loading ? 'Loading...' : 'Analyze Mastery'}
                  </button>
                </div>

                {championMastery.length > 0 && (
                  <div className="mastery-grid">
                    {championMastery.map((mastery, index) => (
                      <div key={index} className="mastery-card">
                        <div className="mastery-level">
                          <span className="level-badge">Level {mastery.championLevel}</span>
                        </div>
                        <div className="mastery-info">
                          <h4>Champion #{mastery.championId}</h4>
                          <div className="mastery-points">
                            <span className="points">{formatNumber(mastery.championPoints)} points</span>
                          </div>
                          <div className="mastery-details">
                            {mastery.chestGranted && <span className="chest-badge">✓ Chest</span>}
                            {mastery.tokensEarned > 0 && <span className="token-badge">{mastery.tokensEarned} Tokens</span>}
                          </div>
                          <div className="last-played">
                            Last played: {formatDate(mastery.lastPlayTime)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'spells' && (
              <div className="spells-section">
                <div className="filters-card">
                  <h3>Summoner Spells Analysis Filters</h3>
                  <div className="filters-grid">
                    <div className="filter-group">
                      <label>Champion Name (optional):</label>
                      <input
                        type="text"
                        placeholder="e.g., Ahri"
                        value={spellsFilters.championName}
                        onChange={(e) => setSpellsFilters({ ...spellsFilters, championName: e.target.value })}
                      />
                    </div>
                    <div className="filter-group">
                      <label>Match Count:</label>
                      <select
                        value={spellsFilters.matchCount}
                        onChange={(e) => setSpellsFilters({ ...spellsFilters, matchCount: e.target.value })}
                      >
                        <option value="5">5 matches</option>
                        <option value="10">10 matches</option>
                        <option value="15">15 matches</option>
                        <option value="20">20 matches</option>
                        <option value="25">25 matches</option>
                      </select>
                    </div>
                  </div>
                  <button onClick={loadSummonerSpells} disabled={loading} className="analyze-button">
                    {loading ? 'Loading...' : 'Analyze Spells'}
                  </button>
                </div>

                {summonerSpells && (
                  <div className="spells-results">
                    <div className="stat-card">
                      <h3>Overall Statistics</h3>
                      <p>Matches Analyzed: {summonerSpells.matches_analyzed}</p>
                      {summonerSpells.champion_filter && <p>Champion Filter: {summonerSpells.champion_filter}</p>}
                      
                      <h4>Most Used Combinations</h4>
                      <div className="combinations-list">
                        {Object.entries(summonerSpells.overall_stats.most_used_combinations).map(([combo, count], index) => (
                          <div key={index} className="combination-item">
                            <span>{combo}</span>
                            <span className="count">{count} games</span>
                          </div>
                        ))}
                      </div>

                      <h4>Spell Effectiveness</h4>
                      <div className="spells-table">
                        <div className="table-header">
                          <div className="table-cell">Spell Combination</div>
                          <div className="table-cell">Games</div>
                          <div className="table-cell">Wins</div>
                          <div className="table-cell">Win Rate</div>
                        </div>
                        {Object.entries(summonerSpells.overall_stats.spell_effectiveness).map(([combo, stats], index) => (
                          <div key={index} className={`table-row ${index % 2 === 0 ? 'even' : 'odd'}`}>
                            <div className="table-cell">{combo}</div>
                            <div className="table-cell">{stats.games}</div>
                            <div className="table-cell">{stats.wins}</div>
                            <div className="table-cell">
                              <span className={stats.win_rate >= 50 ? 'positive' : 'negative'}>
                                {stats.win_rate}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'runes' && (
              <div className="runes-section">
                <div className="filters-card">
                  <h3>Runes Analysis Filters</h3>
                  <div className="filters-grid">
                    <div className="filter-group">
                      <label>Champion Name (optional):</label>
                      <input
                        type="text"
                        placeholder="e.g., Ahri"
                        value={runesFilters.championName}
                        onChange={(e) => setRunesFilters({ ...runesFilters, championName: e.target.value })}
                      />
                    </div>
                    <div className="filter-group">
                      <label>Match Count:</label>
                      <select
                        value={runesFilters.matchCount}
                        onChange={(e) => setRunesFilters({ ...runesFilters, matchCount: e.target.value })}
                      >
                        <option value="5">5 matches</option>
                        <option value="10">10 matches</option>
                        <option value="15">15 matches</option>
                        <option value="20">20 matches</option>
                      </select>
                    </div>
                  </div>
                  <button onClick={loadRuneMasteries} disabled={loading} className="analyze-button">
                    {loading ? 'Loading...' : 'Analyze Runes'}
                  </button>
                </div>

                {runeMasteries && (
                  <div className="runes-results">
                    <div className="stat-card">
                      <h3>Overall Statistics</h3>
                      <p>Matches Analyzed: {runeMasteries.matches_analyzed}</p>
                      {runeMasteries.champion_filter && <p>Champion Filter: {runeMasteries.champion_filter}</p>}
                      
                      <div className="runes-stats-grid">
                        <div>
                          <h4>Most Used Primary Trees</h4>
                          <div className="runes-list">
                            {Object.entries(runeMasteries.overall_stats.most_used_primary_trees).map(([tree, count], index) => (
                              <div key={index} className="rune-item">
                                <span>{tree}</span>
                                <span className="count">{count} games</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4>Most Used Secondary Trees</h4>
                          <div className="runes-list">
                            {Object.entries(runeMasteries.overall_stats.most_used_secondary_trees).map(([tree, count], index) => (
                              <div key={index} className="rune-item">
                                <span>{tree}</span>
                                <span className="count">{count} games</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4>Most Used Keystones</h4>
                          <div className="runes-list">
                            {Object.entries(runeMasteries.overall_stats.most_used_keystones).map(([keystoneId, count], index) => (
                              <div key={index} className="rune-item">
                                <span>Keystone #{keystoneId}</span>
                                <span className="count">{count} games</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
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
