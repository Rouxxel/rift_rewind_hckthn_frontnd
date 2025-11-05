// API service functions
import { API_CONFIG } from '../config/api';
import type { UserCredentials, RiotUser } from '../types/user';

export class ApiError extends Error {
  public status: number;
  
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

const apiRequest = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  const url = `${API_CONFIG.baseURL}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, defaultOptions);
    
    if (!response.ok) {
      let errorText;
      try {
        const errorJson = await response.json();
        errorText = errorJson.detail || errorJson.message || JSON.stringify(errorJson);
      } catch {
        errorText = await response.text();
      }
      throw new ApiError(response.status, errorText || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Handle CORS and network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiError(0, 'CORS error: Unable to connect to backend. Please check if the backend allows requests from this domain.');
    }
    throw new ApiError(0, `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const apiService = {
  // Get user PUUID from Riot ID
  getRiotPuuid: async (credentials: UserCredentials): Promise<RiotUser> => {
    return apiRequest(API_CONFIG.endpoints.getRiotPuuid, {
      method: 'POST',
      body: JSON.stringify({
        game_name: credentials.gameName,
        tag_line: credentials.tagLine,
        region: credentials.region,
      }),
    });
  },

  // Get summoner info using PUUID
  getSummonerInfo: async (puuid: string, region: string) => {
    const params = new URLSearchParams({ puuid, region });
    return apiRequest(`${API_CONFIG.endpoints.getSummonerInfo}?${params}`);
  },

  // Get ranked stats
  getRankedStats: async (puuid: string, region: string) => {
    const params = new URLSearchParams({ puuid, region });
    return apiRequest(`${API_CONFIG.endpoints.getRankedStats}?${params}`);
  },

  // Get champion mastery
  getChampionMastery: async (puuid: string, region: string) => {
    const params = new URLSearchParams({ puuid, region });
    return apiRequest(`${API_CONFIG.endpoints.getChampionMastery}?${params}`);
  },

  // Get match IDs
  getMatchIds: async (puuid: string, region: string, count: number = 10) => {
    return apiRequest(API_CONFIG.endpoints.getMatchIds, {
      method: 'POST',
      body: JSON.stringify({
        puuid,
        region,
        count,
      }),
    });
  },

  // Get player performance analytics
  getPlayerPerformance: async (puuid: string, region: string) => {
    const params = new URLSearchParams({ puuid, region });
    return apiRequest(`${API_CONFIG.endpoints.getPlayerPerformance}?${params}`);
  },

  // Game Assets API methods
  // Get all champions or a specific champion
  getChampions: async (championName?: string) => {
    const params = championName ? new URLSearchParams({ champion_name: championName }) : '';
    return apiRequest(`${API_CONFIG.endpoints.getChampions}${params ? `?${params}` : ''}`);
  },

  // Get all items or a specific item
  getItems: async (itemNameOrId?: string) => {
    const params = itemNameOrId ? new URLSearchParams({ item_name_or_id: itemNameOrId }) : '';
    return apiRequest(`${API_CONFIG.endpoints.getItems}${params ? `?${params}` : ''}`);
  },

  // Get champion abilities and details
  getChampionAbilities: async (championName: string, ability?: string, includeStats: boolean = true, includeTips: boolean = false) => {
    const params = new URLSearchParams({ 
      champion_name: championName,
      include_stats: includeStats.toString(),
      include_tips: includeTips.toString()
    });
    if (ability) {
      params.append('ability', ability);
    }
    return apiRequest(`${API_CONFIG.endpoints.getChampionAbilities}?${params}`);
  },

  // Predictions API methods
  // Get match outcome prediction
  getMatchOutcome: async (blueTeam: string[], redTeam: string[], gameMode: string = 'CLASSIC', averageRank: string = 'GOLD') => {
    return apiRequest(API_CONFIG.endpoints.getMatchOutcome, {
      method: 'POST',
      body: JSON.stringify({
        blue_team: blueTeam,
        red_team: redTeam,
        game_mode: gameMode,
        average_rank: averageRank
      }),
    });
  },

  // Get champion win rates
  getChampionWinrates: async (rank: string = 'ALL', role: string = 'ALL', sortBy: string = 'win_rate', limit: number = 20) => {
    const params = new URLSearchParams({
      rank,
      role,
      sort_by: sortBy,
      limit: limit.toString()
    });
    return apiRequest(`${API_CONFIG.endpoints.getChampionWinrates}?${params}`);
  },
};