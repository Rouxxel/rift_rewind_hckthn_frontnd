import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { storage } from '../../utils/storage';
import { cache, CACHE_KEYS } from '../../utils/cache';
import championsData from '../../data/champions_id_name.json';
import keyStonesRaw from '../../data/key_stones.csv?raw';
import { LoadingSpinner } from '../ui-retro/LoadingSpinner';
import { style } from "./peformancestyles.ts";
import { cn } from '@/lib/utils';

const parseCSV = (csvText: string) => {
  const lines = csvText.trim().split('\n');
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  const result = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const rowValues = [];
    let insideQuote = false;
    let currentVal = '';
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        if (j + 1 < line.length && line[j + 1] === '"') {
          currentVal += '"';
          j++;
        } else {
          insideQuote = !insideQuote;
        }
      } else if (char === ',' && !insideQuote) {
        rowValues.push(currentVal);
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    rowValues.push(currentVal);

    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = rowValues[idx] || '';
    });
    result.push(obj);
  }
  return result;
};

const parsedKeystones = parseCSV(keyStonesRaw);
const KEYSTONE_NAMES: Record<number, string> = {};
parsedKeystones.forEach(row => {
  if (row.id && row.name) {
    KEYSTONE_NAMES[parseInt(row.id)] = row.name;
  }
});

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

const posNegClass = (good: boolean) =>
  good
    ? "!text-[#6fd58a] [text-shadow:0_0_10px_rgba(111,213,138,0.45)]"
    : "!text-hot [text-shadow:0_0_10px_hsl(8_100%_61%/0.45)]";

const posNegInlineClass = (good: boolean) =>
  good ? "text-[#6fd58a] font-bold" : "text-hot font-bold";

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

      const cacheKey = CACHE_KEYS.CHAMPION_MASTERY(userData.puuid);
      const cached = cache.get<any>(cacheKey);

      // Check if we have cached data AND it matches our current search type
      // (This is a bit simplified, but ensures we don't end up with multiple keys)
      if (cached && !loading) {
        const masteryData = cached.mastery_data || cached.data?.mastery_data || cached;
        const isSameSearch = cached.searchParams?.championId === championId &&
          cached.searchParams?.top === top &&
          cached.searchParams?.totalScore === totalScore;

        if (isSameSearch) {
          console.log('✅ Using cached champion mastery (same filters):', cached);
          setChampionMastery(Array.isArray(masteryData) ? masteryData : [masteryData]);
          setHasSearched(true);
          setLoading(false);
          return;
        }
      }

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

      // Cache the result, overwriting any existing cache for this user
      // First, remove any old-style keys that might exist
      cache.removeByPattern(`champion_mastery_${userData.puuid}`);
      
      cache.set(cacheKey, {
        ...response,
        searchParams: { championId, top, totalScore }
      }, 15);
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

      const cacheKey = CACHE_KEYS.SUMMONER_SPELLS(userData.puuid);
      const cached = cache.get<any>(cacheKey);

      if (cached && cached.searchParams?.matchCount === matchCount) {
        console.log('✅ Using cached summoner spells (same filters):', cached);
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
        
        // Cache the result, overwriting any existing cache for this user
        // First, remove any old-style keys that might exist
        cache.removeByPattern(`summoner_spells_${userData.puuid}`);

        cache.set(cacheKey, {
          ...response,
          searchParams: { championName, matchCount }
        }, 15);
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

      const cacheKey = CACHE_KEYS.RUNE_MASTERIES(userData.puuid);
      const cached = cache.get<any>(cacheKey);

      if (cached && cached.searchParams?.matchCount === matchCount) {
        console.log('✅ Using cached rune masteries (same filters):', cached);
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
        
        // Cache the result, overwriting any existing cache for this user
        // First, remove any old-style keys that might exist
        cache.removeByPattern(`rune_masteries_${userData.puuid}`);

        cache.set(cacheKey, {
          ...response,
          searchParams: { championName, matchCount }
        }, 15);
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

  // Keystone mapping loaded globally from CSV

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

  // ---------- Renders ----------
  return (
    <div className="flex flex-col">
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
                className={cn(
                  "group relative inline-flex items-center gap-2 px-4 py-2 rounded-sm",
                  "font-display text-xs uppercase tracking-[0.18em]",
                  "border transition-all duration-200",
                  "before:absolute before:inset-0 before:rounded-[inherit] before:bg-sheen before:pointer-events-none before:opacity-60",
                  isActive
                    ? "bg-gradient-coral text-primary-foreground border-primary/80 shadow-halo"
                    : "bg-surface-inset/70 text-ink/75 border-border hover:text-primary hover:border-primary/60 hover:bg-surface-raised/60",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "relative z-10 inline-block h-1.5 w-1.5 rotate-45",
                    isActive
                      ? "bg-primary-foreground shadow-[0_0_6px_hsl(var(--primary-foreground)/0.8)]"
                      : "bg-primary/70 group-hover:bg-primary",
                  )}
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
          <div className={style.loadingState}>
            <LoadingSpinner />
            <p className="font-display text-sm">Loading {activeTab} data...</p>
          </div>
        )}

        {error && (
          <div className={style.errorState}>
            <p>{error}</p>
            <button
              className={style.retryBtn}
              onClick={() => {
                if (activeTab === 'overview') loadPlayerPerformance();
                else if (activeTab === 'mastery') loadChampionMastery();
                else if (activeTab === 'spells') loadSummonerSpells();
                else if (activeTab === 'runes') loadRuneMasteries();
              }}
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {activeTab === 'overview' && playerPerformance && (
              <div className="my-8 flex flex-col gap-6">
                <div className={style.statsCards}>
                  <div className={style.statCard}>
                    <h3 className={style.h3}>Overall Performance</h3>
                    <div className={style.statGrid}>
                      <div className={style.statItem}>
                        <span className={style.statLabel}>Matches Analyzed</span>
                        <span className={style.statValue}>{playerPerformance.matches_analyzed}</span>
                      </div>
                      <div className={style.statItem}>
                        <span className={style.statLabel}>Win Rate</span>
                        <span className={cn(style.statValue, posNegClass(playerPerformance.overall_performance.win_rate >= 50))}>
                          {formatWinRate(playerPerformance.overall_performance.win_rate)}
                        </span>
                      </div>
                      <div className={style.statItem}>
                        <span className={style.statLabel}>Average KDA</span>
                        <span className={style.statValue}>{formatKDA(playerPerformance.overall_performance.avg_kda)}</span>
                      </div>
                      <div className={style.statItem}>
                        <span className={style.statLabel}>Median KDA</span>
                        <span className={style.statValue}>{formatKDA(playerPerformance.overall_performance.median_kda)}</span>
                      </div>
                      <div className={style.statItem}>
                        <span className={style.statLabel}>CS per Min</span>
                        <span className={style.statValue}>{playerPerformance.overall_performance.avg_cs_per_min.toFixed(1)}</span>
                      </div>
                      <div className={style.statItem}>
                        <span className={style.statLabel}>Damage per Min</span>
                        <span className={style.statValue}>{formatNumber(Math.round(playerPerformance.overall_performance.avg_damage_per_min))}</span>
                      </div>
                      <div className={style.statItem}>
                        <span className={style.statLabel}>Gold per Min</span>
                        <span className={style.statValue}>{formatNumber(Math.round(playerPerformance.overall_performance.avg_gold_per_min))}</span>
                      </div>
                      <div className={style.statItem}>
                        <span className={style.statLabel}>Kill Participation</span>
                        <span className={style.statValue}>{playerPerformance.overall_performance.avg_kill_participation.toFixed(1)}%</span>
                      </div>
                      <div className={style.statItem}>
                        <span className={style.statLabel}>Vision Score</span>
                        <span className={style.statValue}>{playerPerformance.overall_performance.avg_vision_score.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>

                  <div className={style.statCard}>
                    <h3 className={style.h3}>Performance Trends</h3>
                    <div className={style.trendsGrid}>
                      <div className={style.trendSection}>
                        <h4 className={style.h4}>Recent 5 Games</h4>
                        <div className={style.statGrid}>
                          <div className={style.statItem}>
                            <span className={style.statLabel}>Win Rate</span>
                            <span className={cn(style.statValue, posNegClass(playerPerformance.performance_trends.recent_5_games.win_rate >= 50))}>
                              {formatWinRate(playerPerformance.performance_trends.recent_5_games.win_rate)}
                            </span>
                          </div>
                          <div className={style.statItem}>
                            <span className={style.statLabel}>Avg KDA</span>
                            <span className={style.statValue}>{formatKDA(playerPerformance.performance_trends.recent_5_games.avg_kda)}</span>
                          </div>
                        </div>
                      </div>
                      <div className={style.trendSection}>
                        <h4 className={style.h4}>Recent 10 Games</h4>
                        <div className={style.statGrid}>
                          <div className={style.statItem}>
                            <span className={style.statLabel}>Win Rate</span>
                            <span className={cn(style.statValue, posNegClass(playerPerformance.performance_trends.recent_10_games.win_rate >= 50))}>
                              {formatWinRate(playerPerformance.performance_trends.recent_10_games.win_rate)}
                            </span>
                          </div>
                          <div className={style.statItem}>
                            <span className={style.statLabel}>Avg KDA</span>
                            <span className={style.statValue}>{formatKDA(playerPerformance.performance_trends.recent_10_games.avg_kda)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={style.statsCards}>
                  <div className={style.statCard}>
                    <h3 className={style.h3}>Champion Statistics</h3>
                    <div className={style.statGrid}>
                      <div className={style.statItem}>
                        <span className={style.statLabel}>Unique Champions</span>
                        <span className={style.statValue}>{playerPerformance.champion_stats.total_unique_champions}</span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <h4 className={style.h4}>Most Played Champions</h4>
                      <div className={style.mostPlayedList}>
                        {Object.entries(playerPerformance.champion_stats.most_played).map(([champion, games], index) => (
                          <div key={index} className={style.mostPlayedItem}>
                            <span className={style.championName}>{champion}</span>
                            <span className={style.gamesCount}>{games} games</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className={style.statCard}>
                    <h3 className={style.h3}>Role Distribution</h3>
                    <div className={style.roleList}>
                      {Object.entries(playerPerformance.role_distribution)
                        .sort(([, a], [, b]) => b - a)
                        .map(([role, count], index) => (
                          <div key={index} className={style.roleItem}>
                            <span className={style.roleName}>{role}</span>
                            <div className={style.roleBarContainer}>
                              <div
                                className={style.roleBar}
                                style={{ width: `${(count / playerPerformance.matches_analyzed) * 100}%` }}
                              />
                            </div>
                            <span className={style.roleCount}>{count} games</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                {playerPerformance.detailed_matches.length > 0 && (
                  <div className="my-4">
                    <h3 className={style.h3}>Recent Matches</h3>
                    <div className={style.perfTable}>
                      <div className={cn(style.perfRowGrid, style.perfHeader)}>
                        {['Champion', 'Role', 'KDA', 'CS/min', 'DMG/min', 'Gold/min', 'Vision', 'KP%', 'Result'].map((h) => (
                          <div key={h} className={style.perfHeaderCell}>{h}</div>
                        ))}
                      </div>
                      {playerPerformance.detailed_matches.slice(0, 10).map((match, index) => (
                        <div
                          key={index}
                          className={cn(
                            style.perfRowGrid,
                            "hover:bg-coral/10 last:[&_>_*]:border-b-0",
                            index % 2 === 0 ? "bg-base-800/35" : "bg-base-800/15",
                          )}
                        >
                          <div className={style.perfRowCell}>{match.champion}</div>
                          <div className={style.perfRowCell}>{match.role}</div>
                          <div className={style.perfRowCell}>{formatKDA(match.kda)}</div>
                          <div className={style.perfRowCell}>{match.cs_per_min.toFixed(1)}</div>
                          <div className={style.perfRowCell}>{Math.round(match.damage_per_min)}</div>
                          <div className={style.perfRowCell}>{Math.round(match.gold_per_min)}</div>
                          <div className={style.perfRowCell}>{match.vision_score}</div>
                          <div className={style.perfRowCell}>{match.kill_participation}%</div>
                          <div className={style.perfRowCell}>
                            <span className={posNegInlineClass(match.win)}>{match.win ? 'Win' : 'Loss'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'mastery' && (
              <div className="my-8 flex flex-col gap-4">
                <div className={style.filtersCard}>
                  <h3 className={style.h3}>Champion Mastery Filters</h3>
                  {masteryUnavailable && (
                    <div className={style.noticeBox}>
                      ⚠️ Champion mastery data is currently unavailable for this account. This may be due to API limitations or account restrictions.
                    </div>
                  )}
                  <p className={style.noticeBox}>
                    View your champion mastery data. Leave Champion ID empty to see multiple champions, or enter a specific champion ID to see details for that champion only.
                  </p>
                  <div className={style.filtersGrid}>
                    <div className={style.filterGroup}>
                      <label className={style.filterLabel}>Champion ID:</label>
                      <input
                        type="number"
                        placeholder="e.g., 103"
                        value={masteryFilters.championId}
                        onChange={(e) => setMasteryFilters({ ...masteryFilters, championId: e.target.value, totalScore: false })}
                        disabled={masteryUnavailable}
                        className={style.input}
                      />
                    </div>
                    <div className={style.filterGroup}>
                      <label className={style.filterLabel}>Top N:</label>
                      <select
                        value={masteryFilters.top}
                        onChange={(e) => setMasteryFilters({ ...masteryFilters, top: e.target.value })}
                        disabled={masteryFilters.championId !== '' || masteryFilters.totalScore || masteryUnavailable}
                        className={style.select}
                      >
                        <option value="5">Top 5</option>
                        <option value="10">Top 10</option>
                        <option value="20">Top 20</option>
                        <option value="">All</option>
                      </select>
                    </div>
                    <div className={cn(style.filterGroup, style.checkboxGroup)}>
                      <label className={style.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={masteryFilters.totalScore}
                          onChange={(e) => setMasteryFilters({ ...masteryFilters, totalScore: e.target.checked })}
                          disabled={masteryUnavailable}
                          className={style.checkbox}
                        />
                        Get Total Mastery Score Only
                      </label>
                    </div>
                  </div>
                  <button onClick={loadChampionMastery} disabled={loading || masteryUnavailable} className={style.analyzeBtn}>
                    {loading ? 'Loading...' : masteryUnavailable ? 'Unavailable' : 'Analyze Mastery'}
                  </button>
                </div>

                {championMastery.length > 0 && !masteryFilters.totalScore && (
                  <div className={style.masteryGrid}>
                    {championMastery.map((mastery, index) => (
                      <div key={index} className={style.masteryCard}>
                        <div className={style.masteryLevel}>
                          <span className={cn(style.badgeBase, style.levelBadgeColor)}>Level {mastery.championLevel}</span>
                          {mastery.championSeasonMilestone !== undefined && (
                            <span className={cn(style.badgeBase, style.milestoneBadge)} title="Season Milestone">
                              M{mastery.championSeasonMilestone}
                            </span>
                          )}
                        </div>
                        <div className={style.masteryInfo}>
                          <h4 className={style.masteryH4}>{getChampionName(mastery.championId)} #{mastery.championId}</h4>
                          <div>
                            <span className={style.pointsValue}>{formatNumber(mastery.championPoints)} points</span>
                          </div>

                          {(mastery.championPointsUntilNextLevel !== undefined && mastery.championPointsUntilNextLevel > 0) && (
                            <div className={style.masteryProgress}>
                              <div className={style.progressLabels}>
                                <span>{formatNumber(mastery.championPointsSinceLastLevel || 0)}</span>
                                <span>{formatNumber((mastery.championPointsSinceLastLevel || 0) + (mastery.championPointsUntilNextLevel || 0))}</span>
                              </div>
                              <div className={style.progressBarBg}>
                                <div
                                  className={style.progressBarFill}
                                  style={{
                                    width: `${((mastery.championPointsSinceLastLevel || 0) / ((mastery.championPointsSinceLastLevel || 0) + (mastery.championPointsUntilNextLevel || 0))) * 100}%`,
                                  }}
                                />
                              </div>
                              <div className={style.nextLevelLabel}>
                                {formatNumber(mastery.championPointsUntilNextLevel)} to next level
                              </div>
                            </div>
                          )}

                          <div className={style.masteryDetails}>
                            {mastery.chestGranted && <span className={cn(style.badgeBase, style.levelBadgeColor)}>✓ Chest</span>}
                            {mastery.tokensEarned > 0 && (
                              <span className={cn(style.badgeBase, style.levelBadgeColor)}>{mastery.tokensEarned} Tokens</span>
                            )}
                            {mastery.markRequiredForNextLevel !== undefined && mastery.markRequiredForNextLevel > 0 && (
                              <span className={cn(style.badgeBase, style.markBadge)}>{mastery.markRequiredForNextLevel} Marks</span>
                            )}
                          </div>
                          <div className={style.lastPlayed}>
                            Last played: {formatDate(mastery.lastPlayTime)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {masteryFilters.totalScore && championMastery.length > 0 && (
                  <div className={style.statCard}>
                    <h3 className={style.h3}>Total Mastery Score</h3>
                    <div className="text-center p-4">
                      <span className={style.totalScoreValue}>{formatNumber(championMastery[0] as any)}</span>
                      <span className={style.totalScoreLabel}>Total Mastery Points</span>
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
              <div className="my-8 flex flex-col gap-4">
                <div className={style.filtersCard}>
                  <h3 className={style.h3}>Summoner Spells Analysis Filters</h3>
                  <div className={style.filtersGrid}>
                    <div className={style.filterGroup}>
                      <label className={style.filterLabel}>Match Count:</label>
                      <select
                        value={spellsFilters.matchCount}
                        onChange={(e) => setSpellsFilters({ ...spellsFilters, matchCount: e.target.value })}
                        className={style.select}
                      >
                        <option value="5">5 matches</option>
                        <option value="10">10 matches</option>
                        <option value="15">15 matches</option>
                        <option value="20">20 matches</option>
                        <option value="25">25 matches</option>
                      </select>
                    </div>
                  </div>
                  <button onClick={loadSummonerSpells} disabled={loading} className={style.analyzeBtn}>
                    {loading ? 'Loading...' : 'Analyze Spells'}
                  </button>
                </div>

                {summonerSpells && (
                  <div className={style.resultsSection}>
                    <div className={style.statCard}>
                      <h3 className={style.h3}>Overall Statistics</h3>
                      <p>Matches Analyzed: {summonerSpells.matches_analyzed}</p>
                      {summonerSpells.champion_filter && <p>Champion Filter: {summonerSpells.champion_filter}</p>}

                      <div className={style.sectionDivider} />
                      <div>
                        <h4 className={style.h4}>Most Used Combinations</h4>
                        <div className={style.combinationsList}>
                          {Object.entries(summonerSpells.overall_stats.most_used_combinations)
                            .map(([combo, count], index) => (
                              <div key={index} className={style.combinationItem}>
                                <span>{formatSpellName(combo)}</span>
                                <span className={style.count}>{count} games</span>
                              </div>
                            ))}
                        </div>
                      </div>

                      <div className={style.sectionDivider} />

                      <h4 className={style.h4}>Spell Effectiveness</h4>
                      <div className={style.spellsTable}>
                        <div className={cn(style.spellsRowGrid, style.spellsHeader)}>
                          {['Spell Combination', 'Games', 'Wins', 'Win Rate'].map((h) => (
                            <div key={h} className={style.perfHeaderCell}>{h}</div>
                          ))}
                        </div>
                        {Object.entries(summonerSpells.overall_stats.spell_effectiveness)
                          .map(([combo, stats], index) => (
                            <div
                              key={index}
                              className={cn(
                                style.spellsRowGrid,
                                "hover:bg-coral/10 last:[&_>_*]:border-b-0",
                                index % 2 === 0 ? "bg-base-800/35" : "bg-base-800/15",
                              )}
                            >
                              <div className={style.perfRowCell}>{formatSpellName(combo)}</div>
                              <div className={style.perfRowCell}>{stats.games}</div>
                              <div className={style.perfRowCell}>{stats.wins}</div>
                              <div className={style.perfRowCell}>
                                <span className={posNegInlineClass(stats.win_rate >= 50)}>{stats.win_rate}%</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    {Object.keys(summonerSpells.champion_breakdown).length > 0 && (
                      <div className={style.statCard}>
                        <h3 className={style.h3}>Champion Breakdown</h3>
                        <div className={style.legend}>
                          <span className={style.legendLabel}>Legend:</span>
                          <span className={style.legendLabel}>G = Games</span>
                          <span className={style.legendLabel}>W = Wins</span>
                          <span className={style.legendLabel}>% = Win Rate</span>
                        </div>
                        <div className={style.cbGrid}>
                          {Object.entries(summonerSpells.champion_breakdown).map(([champion, spells], index) => (
                            <div key={index} className={style.cbItem}>
                              <h4 className={style.cbH4}>{champion}</h4>
                              <div className="mt-2 flex flex-col gap-0">
                                {Object.entries(spells)
                                  .map(([combo, stats], idx) => (
                                    <div key={idx} className={style.cbItemSmall}>
                                      <span className="flex flex-wrap gap-2 items-center text-ink font-medium">{formatSpellName(combo)}</span>
                                      <div className="flex flex-wrap gap-2 items-center">
                                        <span>{stats.games}G</span>
                                        <span>{stats.wins}W</span>
                                        <span className={posNegInlineClass(stats.win_rate >= 50)}>{stats.win_rate}%</span>
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
              <div className="my-8 flex flex-col gap-4">
                <div className={style.filtersCard}>
                  <h3 className={style.h3}>Runes Analysis Filters</h3>
                  <div className={style.filtersGrid}>
                    <div className={style.filterGroup}>
                      <label className={style.filterLabel}>Match Count:</label>
                      <select
                        value={runesFilters.matchCount}
                        onChange={(e) => setRunesFilters({ ...runesFilters, matchCount: e.target.value })}
                        className={style.select}
                      >
                        <option value="5">5 matches</option>
                        <option value="10">10 matches</option>
                        <option value="15">15 matches</option>
                        <option value="20">20 matches</option>
                      </select>
                    </div>
                  </div>
                  <button onClick={loadRuneMasteries} disabled={loading} className={style.analyzeBtn}>
                    {loading ? 'Loading...' : 'Analyze Runes'}
                  </button>
                </div>

                {runeMasteries && (
                  <div className={style.resultsSection}>
                    <div className={style.statCard}>
                      <h3 className={style.h3}>Overall Statistics</h3>
                      <p>Matches Analyzed: {runeMasteries.matches_analyzed}</p>
                      {runeMasteries.champion_filter && <p>Champion Filter: {runeMasteries.champion_filter}</p>}

                      <div className={style.sectionDivider} />
                      <div className={style.runesStatsGrid}>
                        <div>
                          <h4 className={style.h4}>Primary Trees</h4>
                          <div className={style.combinationsList}>
                            {Object.entries(runeMasteries.overall_stats.most_used_primary_trees).map(([tree, count], index) => (
                              <div key={index} className={style.combinationItem}>
                                <span>{formatRuneTreeName(tree)}</span>
                                <span className={style.count}>{count} games</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className={style.h4}>Secondary Trees</h4>
                          <div className={style.combinationsList}>
                            {Object.entries(runeMasteries.overall_stats.most_used_secondary_trees).map(([tree, count], index) => (
                              <div key={index} className={style.combinationItem}>
                                <span>{formatRuneTreeName(tree)}</span>
                                <span className={style.count}>{count} games</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className={style.h4}>Keystones</h4>
                          <div className={style.combinationsList}>
                            {Object.entries(runeMasteries.overall_stats.most_used_keystones).length === 0 ||
                              Object.entries(runeMasteries.overall_stats.most_used_keystones).every(([keystoneId]) => parseInt(keystoneId) === 0) ? (
                              <div className={style.combinationItem}>
                                <span className={style.noData}>No Keystone</span>
                              </div>
                            ) : (
                              Object.entries(runeMasteries.overall_stats.most_used_keystones)
                                .filter(([keystoneId]) => parseInt(keystoneId) !== 0)
                                .map(([keystoneId, count], index) => (
                                  <div key={index} className={style.combinationItem}>
                                    <span>{getKeystoneName(parseInt(keystoneId))}</span>
                                    <span className={style.count}>{count} games</span>
                                  </div>
                                ))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {Object.keys(runeMasteries.champion_breakdown).length > 0 && (
                      <div className={style.statCard}>
                        <h3 className={style.h3}>Champion Breakdown</h3>
                        <div className={style.cbGrid}>
                          {Object.entries(runeMasteries.champion_breakdown).map(([champion, data], index) => (
                            <div key={index} className={style.cbItem}>
                              <h4 className={style.cbH4}>{champion}</h4>

                              <div className={style.cbSection}>
                                <h5 className={style.cbH5}>Primary Trees</h5>
                                <div className="flex flex-col gap-0">
                                  {Object.entries(data.primary_trees).map(([tree, count], idx) => (
                                    <div key={idx} className={style.cbItemSmall}>
                                      <span className="text-ink font-medium">{formatRuneTreeName(tree)}</span>
                                      <span className={style.cbCount}>{count}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className={style.cbSection}>
                                <h5 className={style.cbH5}>Secondary Trees</h5>
                                <div className="flex flex-col gap-0">
                                  {Object.entries(data.secondary_trees).map(([tree, count], idx) => (
                                    <div key={idx} className={style.cbItemSmall}>
                                      <span className="text-ink font-medium">{formatRuneTreeName(tree)}</span>
                                      <span className={style.cbCount}>{count}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className={style.cbSection}>
                                <h5 className={style.cbH5}>Keystones</h5>
                                <div className="flex flex-col gap-0">
                                  {Object.entries(data.keystones).length === 0 ||
                                    Object.entries(data.keystones).every(([keystoneId]) => parseInt(keystoneId) === 0) ? (
                                    <div className={style.cbItemSmall}>
                                      <span className={style.noData}>No Keystone</span>
                                    </div>
                                  ) : (
                                    Object.entries(data.keystones)
                                      .filter(([keystoneId]) => parseInt(keystoneId) !== 0)
                                      .map(([keystoneId, count], idx) => (
                                        <div key={idx} className={style.cbItemSmall}>
                                          <span className="text-ink font-medium">{getKeystoneName(parseInt(keystoneId))}</span>
                                          <span className={style.cbCount}>{count}</span>
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
