import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { storage } from '../../utils/storage';
import { cache, CACHE_KEYS } from '../../utils/cache';
import championsData from '../../data/champions_id_name.json';

interface PerformanceAnalysisProps {
  onBack: () => void;
}

interface ChampionMastery {
  championId: number;
  championLevel: number;
  championPoints: number;
  championName?: string;
  lastPlayTime: number;
  chestGranted?: boolean;
  tokensEarned: number;
  championPointsSinceLastLevel?: number;
  championPointsUntilNextLevel?: number;
  markRequiredForNextLevel?: number;
  championSeasonMilestone?: number;
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
  const [masteryUnavailable, setMasteryUnavailable] = useState(false);
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
  const [hasSearched, setHasSearched] = useState(false);

  const [spellsFilters, setSpellsFilters] = useState({
    championName: '',
    matchCount: '15'
  });

  const [runesFilters, setRunesFilters] = useState({
    championName: '',
    matchCount: '10'
  });

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

  useEffect(() => {
    if (activeTab === 'overview') {
      loadPlayerPerformance();
    }
    // Don't auto-load other tabs - wait for user to click analyze
  }, [activeTab]);

  const loadChampionMastery = async () => {
    if (!userData || !userCredentials) return;

    setLoading(true);
    setError(null);
    setMasteryUnavailable(false);

    try {
      const championId = masteryFilters.championId ? parseInt(masteryFilters.championId) : undefined;
      const top = masteryFilters.top ? parseInt(masteryFilters.top) : undefined;
      const totalScore = masteryFilters.totalScore;

      const cacheKey = CACHE_KEYS.CHAMPION_MASTERY(userData.puuid, championId, top, totalScore);
      const cached = cache.get<any>(cacheKey);

      if (cached) {
        console.log('✅ Using cached champion mastery:', cached);
        const masteryData = cached.mastery_data || cached.data?.mastery_data || cached;
        setChampionMastery(Array.isArray(masteryData) ? masteryData : [masteryData]);
        setHasSearched(true);
      } else {
        console.log('🔄 Loading champion mastery with filters:', { championId, top, totalScore });
        const response = await apiService.getChampionMastery(
          userData.puuid,
          userCredentials.region,
          championId,
          top,
          totalScore
        );
        console.log('✅ Champion mastery response:', response);

        const masteryData = response.mastery_data || response.data?.mastery_data || [];
        setChampionMastery(Array.isArray(masteryData) ? masteryData : [masteryData]);
        setHasSearched(true);
        cache.set(cacheKey, response, 15);
      }
    } catch (err: any) {
      console.error('❌ Failed to load champion mastery:', err);
      // Mark as unavailable instead of showing error
      setMasteryUnavailable(true);
      setChampionMastery([]);
      setHasSearched(true);
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

      const cacheKey = CACHE_KEYS.SUMMONER_SPELLS(userData.puuid, championName, matchCount);
      const cached = cache.get<SummonerSpellsResponse>(cacheKey);

      if (cached) {
        console.log('✅ Using cached summoner spells:', cached);
        setSummonerSpells(cached);
      } else {
        console.log('🔄 Loading summoner spells analysis with filters:', { championName, matchCount });
        const response = await apiService.getSummonerSpellsAnalysis(
          userData.puuid,
          userCredentials.region,
          championName,
          matchCount
        );
        console.log('✅ Summoner spells response:', response);
        setSummonerSpells(response);
        cache.set(cacheKey, response, 15);
      }
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

      const cacheKey = CACHE_KEYS.RUNE_MASTERIES(userData.puuid, championName, matchCount);
      const cached = cache.get<RuneMasteriesResponse>(cacheKey);

      if (cached) {
        console.log('✅ Using cached rune masteries:', cached);
        setRuneMasteries(cached);
      } else {
        console.log('🔄 Loading rune masteries with filters:', { championName, matchCount });
        const response = await apiService.getRuneMasteries(
          userData.puuid,
          userCredentials.region,
          championName,
          matchCount
        );
        console.log('✅ Rune masteries response:', response);
        setRuneMasteries(response);
        cache.set(cacheKey, response, 15);
      }
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

  // Keystone mapping
  const KEYSTONE_NAMES: Record<number, string> = {
    8005: 'Press the Attack',
    8008: 'Lethal Tempo',
    8021: 'Fleet Footwork',
    8010: 'Conqueror',
    8112: 'Electrocute',
    8128: 'Dark Harvest',
    9923: 'Hail of Blades',
    8351: 'Glacial Augment',
    8360: 'Unsealed Spellbook',
    8369: 'First Strike'
  };

  const getKeystoneName = (keystoneId: number): string => {
    if (keystoneId === 0) return 'Not Selected';
    return KEYSTONE_NAMES[keystoneId] || 'Not Applicable';
  };

  const isUnknownSpell = (spellName: string): boolean => {
    return spellName.includes('Unknown_') || spellName.includes('Unknown,') || spellName.toLowerCase().includes('unknown');
  };

  const formatSpellName = (spellName: string): string => {
    if (isUnknownSpell(spellName)) {
      return 'Not Selected';
    }
    return spellName;
  };

  const formatRuneTreeName = (treeName: string): string => {
    // Check if it's an unknown or invalid tree name
    if (treeName.toLowerCase().includes('unknown') || treeName === '0' || treeName === 'Unknown_0') {
      return 'Not Selected';
    }
    return treeName;
  };

  const getChampionName = (championId: number): string => {
    return (championsData as Record<string, string>)[championId.toString()] || `Champion #${championId}`;
  };

  return (
    <div className="performance-page">
      <div className="mb-4">
        <div className="relative flex flex-wrap items-center gap-2 p-2 rounded-sm border border-border bg-gradient-panel shadow-bevel">
          <span className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
          {([
            { id: 'overview', label: 'Overview' },
            { id: 'mastery', label: 'Champion Mastery' },
            { id: 'spells', label: 'Summoner Spells' },
            { id: 'runes', label: 'Runes' },
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
              <div className={`mastery-section ${masteryUnavailable ? 'unavailable' : ''}`}>
                <div className="filters-card">
                  <h3>Champion Mastery Filters</h3>
                  {masteryUnavailable && (
                    <div className="unavailable-notice">
                      ⚠️ Champion mastery data is currently unavailable for this account. This may be due to API limitations or account restrictions.
                    </div>
                  )}
                  <p className="filter-description">
                    View your champion mastery data. Leave Champion ID empty to see multiple champions, or enter a specific champion ID to see details for that champion only.
                  </p>
                  <div className="filters-grid">
                    <div className="filter-group">
                      <label>Champion ID:</label>
                      <input
                        type="number"
                        placeholder="e.g., 103"
                        value={masteryFilters.championId}
                        onChange={(e) => setMasteryFilters({ ...masteryFilters, championId: e.target.value, totalScore: false })}
                        disabled={masteryUnavailable}
                        className="bg-surface-inset border-border rounded-sm px-2 py-1 text-xs text-ink focus:outline-none focus:border-primary/50 transition-colors w-full"
                      />
                    </div>
                    <div className="filter-group">
                      <label>Top N:</label>
                      <select
                        value={masteryFilters.top}
                        onChange={(e) => setMasteryFilters({ ...masteryFilters, top: e.target.value })}
                        disabled={masteryFilters.championId !== '' || masteryFilters.totalScore || masteryUnavailable}
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
                          disabled={masteryUnavailable}
                        />
                        Get Total Mastery Score Only
                      </label>
                    </div>
                  </div>
                  <button onClick={loadChampionMastery} disabled={loading || masteryUnavailable} className="analyze-button">
                    {loading ? 'Loading...' : masteryUnavailable ? 'Unavailable' : 'Analyze Mastery'}
                  </button>
                </div>

                {championMastery.length > 0 && !masteryFilters.totalScore && (
                  <div className="mastery-grid">
                    {championMastery.map((mastery, index) => (
                      <div key={index} className="mastery-card">
                        <div className="mastery-level">
                          <span className="level-badge">Level {mastery.championLevel}</span>
                          {mastery.championSeasonMilestone !== undefined && (
                            <span className="milestone-badge" title="Season Milestone">
                              M{mastery.championSeasonMilestone}
                            </span>
                          )}
                        </div>
                        <div className="mastery-info">
                          <h4>{getChampionName(mastery.championId)} #{mastery.championId}</h4>
                          <div className="mastery-points">
                            <span className="points">{formatNumber(mastery.championPoints)} points</span>
                          </div>

                          {(mastery.championPointsUntilNextLevel !== undefined && mastery.championPointsUntilNextLevel > 0) && (
                            <div className="mastery-progress">
                              <div className="progress-labels">
                                <span>{formatNumber(mastery.championPointsSinceLastLevel || 0)}</span>
                                <span>{formatNumber((mastery.championPointsSinceLastLevel || 0) + (mastery.championPointsUntilNextLevel || 0))}</span>
                              </div>
                              <div className="progress-bar-bg">
                                <div
                                  className="progress-bar-fill"
                                  style={{
                                    width: `${((mastery.championPointsSinceLastLevel || 0) / ((mastery.championPointsSinceLastLevel || 0) + (mastery.championPointsUntilNextLevel || 0))) * 100}%`
                                  }}
                                />
                              </div>
                              <div className="next-level-label">
                                {formatNumber(mastery.championPointsUntilNextLevel)} to next level
                              </div>
                            </div>
                          )}

                          <div className="mastery-details">
                            {mastery.chestGranted && <span className="chest-badge">✓ Chest</span>}
                            {mastery.tokensEarned > 0 && <span className="token-badge">{mastery.tokensEarned} Tokens</span>}
                            {mastery.markRequiredForNextLevel !== undefined && mastery.markRequiredForNextLevel > 0 && (
                              <span className="mark-badge">{mastery.markRequiredForNextLevel} Marks</span>
                            )}
                          </div>
                          <div className="last-played">
                            Last played: {formatDate(mastery.lastPlayTime)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {masteryFilters.totalScore && championMastery.length > 0 && (
                  <div className="stat-card">
                    <h3>Total Mastery Score</h3>
                    <div className="total-score-display">
                      <span className="total-score-value">{formatNumber(championMastery[0] as any)}</span>
                      <span className="total-score-label">Total Mastery Points</span>
                    </div>
                  </div>
                )}

                {!loading && hasSearched && championMastery.length === 0 && !masteryFilters.totalScore && (
                  <div className="group relative mt-6 overflow-hidden rounded-sm border border-dashed border-border bg-surface-inset/30 p-12 text-center transition-all hover:bg-surface-inset/50">
                    <div className="relative z-10 flex flex-col items-center gap-3">
                      <div className="relative">
                        <div className="absolute -inset-4 rounded-full bg-primary/10 blur-xl group-hover:bg-primary/15 transition-colors" />
                        <span className="relative text-4xl grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500">🔍</span>
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-display text-xs uppercase tracking-[0.2em] text-ink/80">No Mastery Data Found</h4>
                        <p className="text-[10px] text-ink/40 tracking-wider">WE COULDN'T FIND ANY ENTRIES MATCHING YOUR FILTERS</p>
                      </div>
                    </div>
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

                      <div className="section-divider"></div>
                      <div>
                        <h4>Most Used Combinations</h4>
                        <div className="combinations-list">
                          {Object.entries(summonerSpells.overall_stats.most_used_combinations)
                            .map(([combo, count], index) => (
                              <div key={index} className="combination-item">
                                <span>{formatSpellName(combo)}</span>
                                <span className="count">{count} games</span>
                              </div>
                            ))}
                        </div>
                      </div>

                      <div className="section-divider"></div>

                      <h4>Spell Effectiveness</h4>
                      <div className="spells-table">
                        <div className="table-header">
                          <div className="table-cell">Spell Combination</div>
                          <div className="table-cell">Games</div>
                          <div className="table-cell">Wins</div>
                          <div className="table-cell">Win Rate</div>
                        </div>
                        {Object.entries(summonerSpells.overall_stats.spell_effectiveness)
                          .map(([combo, stats], index) => (
                            <div key={index} className={`table-row ${index % 2 === 0 ? 'even' : 'odd'}`}>
                              <div className="table-cell">{formatSpellName(combo)}</div>
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

                    {Object.keys(summonerSpells.champion_breakdown).length > 0 && (
                      <div className="stat-card">
                        <h3>Champion Breakdown</h3>
                        <div className="legend">
                          <span className="legend-label">Legend:</span>
                          <span className="legend-label">G = Games</span>
                          <span className="legend-label">W = Wins</span>
                          <span className="legend-label">% = Win Rate</span>
                        </div>
                        <div className="champion-breakdown-grid">
                          {Object.entries(summonerSpells.champion_breakdown).map(([champion, spells], index) => (
                            <div key={index} className="champion-breakdown-item">
                              <h4>{champion}</h4>
                              <div className="breakdown-spells-list">
                                {Object.entries(spells)
                                  .map(([combo, stats], idx) => (
                                    <div key={idx} className="breakdown-spell-item">
                                      <span className="spell-combo">{formatSpellName(combo)}</span>
                                      <div className="spell-stats">
                                        <span>{stats.games}G</span>
                                        <span>{stats.wins}W</span>
                                        <span className={stats.win_rate >= 50 ? 'positive' : 'negative'}>
                                          {stats.win_rate}%
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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

                      <div className="section-divider"></div>
                      <div className="runes-stats-grid">
                        <div>
                          <h4>Primary Trees</h4>
                          <div className="runes-list">
                            {Object.entries(runeMasteries.overall_stats.most_used_primary_trees).map(([tree, count], index) => (
                              <div key={index} className="rune-item">
                                <span>{formatRuneTreeName(tree)}</span>
                                <span className="count">{count} games</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4>Secondary Trees</h4>
                          <div className="runes-list">
                            {Object.entries(runeMasteries.overall_stats.most_used_secondary_trees).map(([tree, count], index) => (
                              <div key={index} className="rune-item">
                                <span>{formatRuneTreeName(tree)}</span>
                                <span className="count">{count} games</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4>Keystones</h4>
                          <div className="runes-list">
                            {Object.entries(runeMasteries.overall_stats.most_used_keystones).length === 0 ||
                              Object.entries(runeMasteries.overall_stats.most_used_keystones).every(([keystoneId]) => parseInt(keystoneId) === 0) ? (
                              <div className="rune-item">
                                <span className="no-data">No Keystone</span>
                              </div>
                            ) : (
                              Object.entries(runeMasteries.overall_stats.most_used_keystones)
                                .filter(([keystoneId]) => parseInt(keystoneId) !== 0)
                                .map(([keystoneId, count], index) => (
                                  <div key={index} className="rune-item">
                                    <span>{getKeystoneName(parseInt(keystoneId))}</span>
                                    <span className="count">{count} games</span>
                                  </div>
                                ))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {Object.keys(runeMasteries.champion_breakdown).length > 0 && (
                      <div className="stat-card">
                        <h3>Champion Breakdown</h3>
                        <div className="champion-breakdown-grid">
                          {Object.entries(runeMasteries.champion_breakdown).map(([champion, data], index) => (
                            <div key={index} className="champion-breakdown-item">
                              <h4>{champion}</h4>
                              <div className="breakdown-section">
                                <h5>Primary Trees</h5>
                                <div className="breakdown-list">
                                  {Object.entries(data.primary_trees).map(([tree, count], idx) => (
                                    <div key={idx} className="breakdown-item-small">
                                      <span>{formatRuneTreeName(tree)}</span>
                                      <span className="count">{count}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="breakdown-section">
                                <h5>Secondary Trees</h5>
                                <div className="breakdown-list">
                                  {Object.entries(data.secondary_trees).map(([tree, count], idx) => (
                                    <div key={idx} className="breakdown-item-small">
                                      <span>{formatRuneTreeName(tree)}</span>
                                      <span className="count">{count}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="breakdown-section">
                                <h5>Keystones</h5>
                                <div className="breakdown-list">
                                  {Object.entries(data.keystones).length === 0 ||
                                    Object.entries(data.keystones).every(([keystoneId]) => parseInt(keystoneId) === 0) ? (
                                    <div className="breakdown-item-small">
                                      <span className="no-data">No Keystone</span>
                                    </div>
                                  ) : (
                                    Object.entries(data.keystones)
                                      .filter(([keystoneId]) => parseInt(keystoneId) !== 0)
                                      .map(([keystoneId, count], idx) => (
                                        <div key={idx} className="breakdown-item-small">
                                          <span>{getKeystoneName(parseInt(keystoneId))}</span>
                                          <span className="count">{count}</span>
                                        </div>
                                      ))
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
