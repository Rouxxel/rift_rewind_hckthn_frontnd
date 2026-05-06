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

// Smart backend URL detection with fallback
let cachedBackendURL: string | null = null;

// Export function to reset backend detection (useful for testing)
export const resetBackendURL = () => {
  console.log('🔄 Resetting backend URL cache');
  cachedBackendURL = null;
};

const getBackendURL = async (): Promise<string> => {
  // If we already found a working backend, use it
  if (cachedBackendURL) {
    return cachedBackendURL;
  }

  // Check localStorage for previously working backend
  try {
    const storedURL = localStorage.getItem('rift_backend_url');
    if (storedURL) {
      console.log(`💾 Trying cached backend: ${storedURL}`);
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${storedURL}/`, {
          method: 'GET',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          console.log(`✅ Cached backend still works: ${storedURL}`);
          cachedBackendURL = storedURL;
          return storedURL;
        }
      } catch (e) {
        console.log(`❌ Cached backend no longer works, trying alternatives...`);
        localStorage.removeItem('rift_backend_url');
      }
    }
  } catch (e) {
    // Ignore localStorage errors
  }

  // List of backend URLs to try (in order of preference)
  // Priority changes based on environment:
  // - Development: localhost first (fast), then Render (fallback)
  // - Production: Render first (most likely), then localhost (won't work)
  const isDevelopment = import.meta.env.MODE === 'development' || import.meta.env.DEV;
  
  const backendURLs = isDevelopment
    ? [
        'http://localhost:8000',                            // Local backend (try first in dev)
        'https://rift-rewind-hckthn-backend.onrender.com', // Render backend (fallback)
        import.meta.env.VITE_API_BASE_URL,                 // Environment variable (last resort)
      ]
    : [
        'https://rift-rewind-hckthn-backend.onrender.com', // Production backend (try first)
        'http://localhost:8000',                            // Local backend (won't work in prod)
        import.meta.env.VITE_API_BASE_URL,                 // Environment variable (last resort)
      ];
  
  const filteredURLs = backendURLs.filter((url, index, self) => url && self.indexOf(url) === index); // Remove duplicates and undefined

  console.log(`🔍 Detecting available backend... (Mode: ${isDevelopment ? 'Development' : 'Production'})`);

  // Try each backend URL
  for (const url of filteredURLs) {
    try {
      console.log(`⏳ Trying backend: ${url}`);
      const controller = new AbortController();
      
      // Longer timeout for Render (cold start can take ~30s)
      const timeout = url.includes('render.com') ? 35000 : 3000;
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(`${url}/`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        console.log(`✅ Backend found at: ${url}`);
        cachedBackendURL = url;
        
        // Store in localStorage for faster subsequent loads
        try {
          localStorage.setItem('rift_backend_url', url);
        } catch (e) {
          // Ignore localStorage errors
        }
        
        return url;
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log(`⏱️ Backend timeout at: ${url}`);
      } else {
        console.log(`❌ Backend not available at: ${url}`);
      }
      // Continue to next URL
    }
  }

  // If no backend is available, use the configured one and let it fail naturally
  const fallbackURL = API_CONFIG.baseURL;
  console.warn(`⚠️ No backend detected, using fallback: ${fallbackURL}`);
  cachedBackendURL = fallbackURL;
  return fallbackURL;
};

const apiRequest = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  // Get the working backend URL (with smart detection)
  const baseURL = await getBackendURL();
  const url = `${baseURL}${endpoint}`;
  
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
      // Clone the response so we can read it multiple times if needed
      const clonedResponse = response.clone();
      let errorText;
      
      try {
        const errorJson = await response.json();
        errorText = errorJson.detail || errorJson.message || JSON.stringify(errorJson);
      } catch {
        try {
          errorText = await clonedResponse.text();
        } catch {
          errorText = `HTTP ${response.status}`;
        }
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
  getChampionMastery: async (puuid: string, region: string, championId?: number, top?: number, totalScore?: boolean) => {
    const params = new URLSearchParams({ puuid, region });
    if (championId) params.append('champion_id', championId.toString());
    if (top) params.append('top', top.toString());
    if (totalScore) params.append('total_score', totalScore.toString());
    return apiRequest(`${API_CONFIG.endpoints.getChampionMastery}?${params}`);
  },

  // Get summoner spells analysis
  getSummonerSpellsAnalysis: async (puuid: string, region: string, championName?: string, matchCount?: number) => {
    const params = new URLSearchParams({ puuid, region });
    if (championName) params.append('champion_name', championName);
    if (matchCount) params.append('match_count', matchCount.toString());
    return apiRequest(`${API_CONFIG.endpoints.getSummonerSpellsAnalysis}?${params}`);
  },

  // Get rune masteries
  getRuneMasteries: async (puuid: string, region: string, championName?: string, matchCount?: number) => {
    const params = new URLSearchParams({ puuid, region });
    if (championName) params.append('champion_name', championName);
    if (matchCount) params.append('match_count', matchCount.toString());
    return apiRequest(`${API_CONFIG.endpoints.getRuneMasteries}?${params}`);
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

  // Match History API methods
  // Get match history by PUUID (using existing getMatchIds endpoint)
  getMatchHistory: async (puuid: string, region: string, count: number = 10) => {
    return apiRequest(API_CONFIG.endpoints.getMatchIds, {
      method: 'POST',
      body: JSON.stringify({
        puuid,
        region,
        count
      }),
    });
  },

  // Get match details by ID (using existing endpoint)
  getMatchDetailsById: async (matchId: string, region: string) => {
    return apiRequest(API_CONFIG.endpoints.getMatchDetails, {
      method: 'POST',
      body: JSON.stringify({
        match_id: matchId,
        region
      }),
    });
  },

  // Get match participants info
  getMatchParticipants: async (matchId: string, region: string, numParticipants: number = -1, simplified: boolean = false) => {
    return apiRequest(API_CONFIG.endpoints.getMatchParticipants, {
      method: 'POST',
      body: JSON.stringify({
        match_id: matchId,
        region,
        num_participants: numParticipants,
        simplified
      }),
    });
  },

  // Get match timeline
  getMatchTimeline: async (matchId: string, region: string, eventTypes?: string[], participantId?: number) => {
    const body: any = {
      match_id: matchId,
      region
    };
    
    if (eventTypes) body.event_types = eventTypes;
    if (participantId) body.participant_id = participantId;

    return apiRequest(API_CONFIG.endpoints.getMatchTimeline, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  // Analysis API methods
  // Get team composition analysis
  getTeamComposition: async (champions: string[], enemyChampions?: string[], gamePhase: string = 'all') => {
    const body: any = {
      champions,
      game_phase: gamePhase
    };
    
    if (enemyChampions) body.enemy_champions = enemyChampions;

    return apiRequest(API_CONFIG.endpoints.getTeamComposition, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  // AI Assistant API methods
  // Get AI response for chat
  getAIResponse: async (
    prompt: string,
    contextData?: any,
    conversationHistory?: Array<{ role: string; content: string }>
  ) => {
    const body: any = {
      prompt
    };

    if (contextData) body.context_data = contextData;
    if (conversationHistory) body.conversation_history = conversationHistory;

    return apiRequest('/ai/generate_ai_response', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};