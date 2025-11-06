// API Configuration
export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  environment: import.meta.env.VITE_ENVIRONMENT || 'development',
  endpoints: {
    getRiotPuuid: '/user/get_riot_puuid',
    getSummonerInfo: '/user/get_summoner_info',
    getMatchIds: '/user/get_lol_match_ids',
    getChampionMastery: '/user/get_champion_mastery',
    getRankedStats: '/user/get_ranked_stats',
    getMatchDetails: '/match/get_lol_match_details',
    getPlayerPerformance: '/analytics/get_player_performance',
    // Game Assets endpoints
    getChampions: '/game_assets/get_lol_champions',
    getItems: '/game_assets/get_lol_items',
    getChampionAbilities: '/game_assets/get_champion_abilities',
    // Predictions endpoints
    getMatchOutcome: '/predictions/get_match_outcome',
    getChampionWinrates: '/analytics/get_champion_winrates',
    // Match History endpoints
    getMatchParticipants: '/match/get_lol_match_participants_info',
    getMatchTimeline: '/match/get_match_timeline',
    // Analysis endpoints
    getTeamComposition: '/analysis/get_team_composition',
  }
};

// Regions mapping for the backend
export const REGIONS = {
  'North America': 'americas',
  'Europe': 'europe', 
  'Asia': 'asia',
  'Southeast Asia': 'sea'
} as const;

export type RegionKey = keyof typeof REGIONS;
export type RegionValue = typeof REGIONS[RegionKey];