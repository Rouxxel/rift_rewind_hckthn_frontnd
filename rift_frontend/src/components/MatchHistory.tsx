import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { cache, CACHE_KEYS } from '../utils/cache';
import logo from '../assets/logo.png';

interface MatchHistoryProps {
  onBack: () => void;
}

interface UserData {
  puuid: string;
  gameName: string;
  tagLine: string;
}

interface UserCredentials {
  gameName: string;
  tagLine: string;
  region: string;
}

// Removed MatchSummary interface - not needed anymore

interface MatchDetails {
  match_id: string;
  match_info: any;
}

interface MatchParticipant {
  summonerName: string;
  championName: string;
  kills: number;
  deaths: number;
  assists: number;
  goldEarned: number;
  totalMinionsKilled: number;
  win: boolean;
  items_detailed: Array<{
    id: number;
    name: string;
    description: string;
  }>;
  teamId: number;
}

interface TeamComposition {
  team_composition: {
    champions: Array<{
      name: string;
      title: string;
      tags: string[];
      stats: {
        attack: number;
        defense: number;
        magic: number;
        difficulty: number;
      };
      primary_role: string;
    }>;
    archetype: string;
    archetype_description: string;
  };
  team_stats: {
    averages: {
      attack: number;
      defense: number;
      magic: number;
      difficulty: number;
    };
    role_diversity: number;
    unique_roles: string[];
  };
  analysis: {
    strengths: string[];
    weaknesses: string[];
    phase_analysis: any;
  };
  strategic_recommendations: string[];
  win_conditions: string[];
}

interface MatchTimeline {
  match_id: string;
  region: string;
  game_duration: number;
  interval: number;
  summary: {
    total_frames: number;
    total_kills: number;
    total_item_events: number;
    total_ward_events: number;
    total_objective_events: number;
  };
  frames: Array<{
    timestamp: number;
    minute: number;
    events: {
      kills: any[];
      deaths: any[];
      assists: any[];
      item_events: any[];
      ward_events: any[];
      objective_events: any[];
      other_events: any[];
    };
    participant_frames: any;
  }>;
}

export const MatchHistory: React.FC<MatchHistoryProps> = ({ onBack }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userCredentials, setUserCredentials] = useState<UserCredentials | null>(null);
  const [matchHistory, setMatchHistory] = useState<string[]>([]);
  // Removed matchSummaries state - not needed anymore
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [matchDetails, setMatchDetails] = useState<MatchDetails | null>(null);
  const [matchParticipants, setMatchParticipants] = useState<MatchParticipant[]>([]);
  const [teamComposition, setTeamComposition] = useState<TeamComposition | null>(null);
  const [matchTimeline, setMatchTimeline] = useState<MatchTimeline | null>(null);
  const [matchPrediction, setMatchPrediction] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (userData && userCredentials) {
      loadMatchHistory();
    }
  }, [userData, userCredentials]);

  const loadUserData = () => {
    try {
      const storedUserData = localStorage.getItem('rift_rewind_user_data');
      const storedCredentials = localStorage.getItem('rift_rewind_user_credentials');

      if (storedUserData) {
        const parsedUserData = JSON.parse(storedUserData);
        setUserData(parsedUserData);
        console.log('✅ Loaded user data:', parsedUserData);
      } else {
        setError('No user data found. Please register first from the landing page.');
        return;
      }

      if (storedCredentials) {
        const parsedCredentials = JSON.parse(storedCredentials);
        setUserCredentials(parsedCredentials);
        console.log('✅ Loaded user credentials:', parsedCredentials);
      } else {
        setError('No user credentials found. Please register first from the landing page.');
        return;
      }
    } catch (err) {
      console.error('❌ Failed to load user data:', err);
      setError('Failed to load user data from storage.');
    }
  };

  const loadMatchHistory = async () => {
    if (!userData || !userCredentials) return;

    // Check cache first
    const cacheKey = CACHE_KEYS.MATCH_HISTORY(userData.puuid);
    const cachedHistory = cache.get<string[]>(cacheKey);

    if (cachedHistory) {
      console.log('✅ Using cached match history');
      setMatchHistory(cachedHistory);
      // Don't load summaries automatically - only when match is selected
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Loading match history from API...');

      const response = await apiService.getMatchHistory(
        userData.puuid,
        userCredentials.region,
        20 // Get last 20 matches
      );

      console.log('✅ Match history loaded:', response);
      const matchIds = response.match_ids || [];

      setMatchHistory(matchIds);

      // Cache for 10 minutes
      cache.set(cacheKey, matchIds, 10);

      // Don't load match summaries automatically - only when match is selected

    } catch (err: any) {
      console.error('❌ Failed to load match history:', err);
      setError(`Failed to load match history: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Removed loadMatchSummaries - we don't need to load match details automatically

  const selectMatch = async (matchId: string) => {
    if (!userCredentials) return;

    setSelectedMatch(matchId);
    setShowDetails(true);
    setMatchDetails(null);
    setMatchParticipants([]);
    setTeamComposition(null);
    setMatchTimeline(null);
    setMatchPrediction(null);

    // Load match details
    await loadMatchDetails(matchId);
    // Load participants
    await loadMatchParticipants(matchId);
    // Load timeline
    await loadMatchTimeline(matchId);
  };

  const loadMatchDetails = async (matchId: string) => {
    if (!userCredentials) return;

    setLoadingStates(prev => ({ ...prev, details: true }));

    try {
      // Check cache first
      const cacheKey = CACHE_KEYS.MATCH_DETAILS(matchId);
      let cachedDetails = cache.get<any>(cacheKey);

      if (cachedDetails) {
        console.log(`✅ Using cached match details for ${matchId}`);
        setMatchDetails({
          match_id: matchId,
          match_info: cachedDetails
        });
      } else {
        console.log(`🔄 Loading match details for ${matchId}...`);
        const response = await apiService.getMatchDetailsById(matchId, userCredentials.region);
        console.log('✅ Match details loaded:', response);

        setMatchDetails(response);

        // Cache for 60 minutes
        cache.set(cacheKey, response.match_info, 60);
      }

    } catch (err: any) {
      console.error('❌ Failed to load match details:', err);
      setError(`Failed to load match details: ${err.message}`);
    } finally {
      setLoadingStates(prev => ({ ...prev, details: false }));
    }
  };

  const loadMatchParticipants = async (matchId: string) => {
    if (!userCredentials) return;

    setLoadingStates(prev => ({ ...prev, participants: true }));

    try {
      // Check cache first
      const cacheKey = CACHE_KEYS.MATCH_PARTICIPANTS(matchId);
      let cachedParticipants = cache.get<MatchParticipant[]>(cacheKey);

      if (cachedParticipants) {
        console.log(`✅ Using cached match participants for ${matchId}`);
        setMatchParticipants(cachedParticipants);
        // Load team composition analysis
        await loadTeamComposition(cachedParticipants);
      } else {
        console.log(`🔄 Loading match participants for ${matchId}...`);
        const response = await apiService.getMatchParticipants(matchId, userCredentials.region, -1, true);
        console.log('✅ Match participants loaded:', response);

        const participants = response.participants || [];
        setMatchParticipants(participants);

        // Cache for 60 minutes
        cache.set(cacheKey, participants, 60);

        // Load team composition analysis
        await loadTeamComposition(participants);
        // Matd match ption will be loaded manually via button click
      }

    } catch (err: any) {
      console.error('❌ Failed to load match participants:', err);
      setError(`Failed to load match participants: ${err.message}`);
    } finally {
      setLoadingStates(prev => ({ ...prev, participants: false }));
    }
  };

  // Function to split camelCase/PascalCase champion names by capital letters
  const splitByCapitals = (championName: string): string => {
    // Split by capital letters but keep the capital with the following word
    // "MissFortune" -> "Miss Fortune", "LeeSin" -> "Lee Sin"
    return championName
      .replace(/([A-Z])/g, ' $1') // Add space before each capital
      .trim() // Remove leading space
      .replace(/\s+/g, ' '); // Normalize multiple spaces to single space
  };

  // Function to try adding apostrophes at capital letter positions
  const addApostrophes = (championName: string): string => {
    // For names like "KSante" -> "K'Sante", "KhaZix" -> "Kha'Zix"
    // Add apostrophe before capital letters (except the first one)
    return championName
      .replace(/([a-z])([A-Z])/g, "$1'$2"); // Add apostrophe between lowercase and uppercase
  };

  // Function to try different champion name formats
  const getChampionNameVariations = (championName: string): string[] => {
    const variations: string[] = [];
    
    // 1. Split by capitals first (most common case): "MissFortune" -> "Miss Fortune", "KSante" -> "K Sante"
    const splitName = splitByCapitals(championName);
    variations.push(splitName);
    
    // 2. If split name is different, try with apostrophes: "K Sante" -> "K'Sante"
    if (splitName !== championName) {
      const splitWithApostrophe = splitName.replace(/\s+/g, "'");
      if (splitWithApostrophe !== splitName) {
        variations.push(splitWithApostrophe);
      }
    }
    
    // 3. Try original name as fallback
    if (!variations.includes(championName)) {
      variations.push(championName);
    }
    
    // 4. Try adding apostrophes to original: "KSante" -> "K'Sante" (without space first)
    const apostropheName = addApostrophes(championName);
    if (apostropheName !== championName && !variations.includes(apostropheName)) {
      variations.push(apostropheName);
    }
    
    return variations;
  };

  // Smart retry mechanism for champion name resolution
  const tryPredictionWithNameResolution = async (
    winningTeamOriginal: string[],
    losingTeamOriginal: string[]
  ): Promise<{ success: boolean; response?: any; winningTeam?: string[]; losingTeam?: string[]; error?: string }> => {
    // Generate all possible name variations for each champion
    const winningVariations = winningTeamOriginal.map(name => getChampionNameVariations(name));
    const losingVariations = losingTeamOriginal.map(name => getChampionNameVariations(name));

    console.log('🔄 Champion name variations:', { winningVariations, losingVariations });

    // Try all combinations (starting with most likely: all split by capitals)
    const maxAttempts = 50; // Limit total attempts to avoid infinite loops
    let attemptCount = 0;

    // Helper function to generate next combination
    const tryNextCombination = async (
      winningIndices: number[],
      losingIndices: number[]
    ): Promise<{ success: boolean; response?: any; winningTeam?: string[]; losingTeam?: string[]; error?: string }> => {
      if (attemptCount >= maxAttempts) {
        return { success: false, error: 'Maximum retry attempts reached' };
      }

      attemptCount++;

      const winningTeam = winningIndices.map((idx, i) => winningVariations[i][idx]);
      const losingTeam = losingIndices.map((idx, i) => losingVariations[i][idx]);

      console.log(`🔄 Attempt ${attemptCount}: Trying combination:`, { winningTeam, losingTeam });

      try {
        const response = await apiService.getMatchOutcome(winningTeam, losingTeam, 'CLASSIC', 'GOLD');
        console.log(`✅ Success on attempt ${attemptCount}!`);
        return { success: true, response, winningTeam, losingTeam };
      } catch (err: any) {
        // Check if it's a rate limit error
        if (err.status === 429 || err.message.includes('rate limit') || err.message.includes('Too Many Requests')) {
          console.error('⚠️ Rate limit hit, stopping retries');
          return { success: false, error: 'Rate limit reached. Please try again later.' };
        }

        // Check if it's a 404 (champion not found) - we can retry
        if (err.status === 404 || err.message.includes('not found')) {
          // Extract champion name from error message
          const championMatch = err.message.match(/Champion '([^']+)' not found/);
          const notFoundChampion = championMatch ? championMatch[1] : 'unknown';
          
          console.log(`❌ Attempt ${attemptCount} failed: Champion '${notFoundChampion}' not found (tried: ${winningTeam.join(', ')} vs ${losingTeam.join(', ')})`);
          
          // Try next combination
          const nextCombination = getNextCombination(winningIndices, losingIndices, winningVariations, losingVariations);
          
          if (nextCombination) {
            return await tryNextCombination(nextCombination.winningIndices, nextCombination.losingIndices);
          } else {
            return { success: false, error: `Could not resolve champion names after ${attemptCount} attempts. Last failed champion: '${notFoundChampion}'` };
          }
        }

        // Other errors (network, server, etc.) - don't retry
        console.error('❌ Non-retryable error:', err);
        return { success: false, error: err.message };
      }
    };

    // Helper to get next combination (increment indices like a counter)
    const getNextCombination = (
      winningIndices: number[],
      losingIndices: number[],
      winningVars: string[][],
      losingVars: string[][]
    ): { winningIndices: number[]; losingIndices: number[] } | null => {
      // Try incrementing winning team indices first
      const newWinningIndices = [...winningIndices];
      for (let i = newWinningIndices.length - 1; i >= 0; i--) {
        if (newWinningIndices[i] < winningVars[i].length - 1) {
          newWinningIndices[i]++;
          return { winningIndices: newWinningIndices, losingIndices };
        } else {
          newWinningIndices[i] = 0;
        }
      }

      // If all winning combinations exhausted, try next losing combination
      const newLosingIndices = [...losingIndices];
      for (let i = newLosingIndices.length - 1; i >= 0; i--) {
        if (newLosingIndices[i] < losingVars[i].length - 1) {
          newLosingIndices[i]++;
          return { winningIndices: Array(winningIndices.length).fill(0), losingIndices: newLosingIndices };
        } else {
          newLosingIndices[i] = 0;
        }
      }

      // All combinations exhausted
      return null;
    };

    // Start with all indices at 0 (first variation for each champion)
    const initialWinningIndices = Array(winningTeamOriginal.length).fill(0);
    const initialLosingIndices = Array(losingTeamOriginal.length).fill(0);

    return await tryNextCombination(initialWinningIndices, initialLosingIndices);
  };

  const loadTeamComposition = async (participants: MatchParticipant[]) => {
    if (participants.length === 0) return;

    setLoadingStates(prev => ({ ...prev, composition: true }));

    try {
      // Split into teams by win/loss status (get original names)
      const winningTeamOriginal = participants.filter(p => p.win === true).map(p => p.championName);
      const losingTeamOriginal = participants.filter(p => p.win === false).map(p => p.championName);

      if (winningTeamOriginal.length > 0 && losingTeamOriginal.length > 0 && winningTeamOriginal.length === losingTeamOriginal.length) {
        // Try to get composition with smart name resolution
        const result = await tryCompositionWithNameResolution(winningTeamOriginal, losingTeamOriginal);
        
        if (result.success) {
          console.log('✅ Team composition analysis loaded:', result.response);
          setTeamComposition(result.response);

          // Cache for 30 minutes using the successful names
          const cacheKey = CACHE_KEYS.TEAM_COMPOSITION(result.winningTeam!);
          cache.set(cacheKey, result.response, 30);
        } else {
          console.error('❌ Failed to resolve champion names for composition:', result.error);
          // Don't set error for team composition as it's not critical
        }
      }

    } catch (err: any) {
      console.error('❌ Failed to load team composition:', err);
      // Don't set error for team composition as it's not critical
    } finally {
      setLoadingStates(prev => ({ ...prev, composition: false }));
    }
  };

  // Smart retry mechanism for team composition name resolution
  const tryCompositionWithNameResolution = async (
    winningTeamOriginal: string[],
    losingTeamOriginal: string[]
  ): Promise<{ success: boolean; response?: any; winningTeam?: string[]; losingTeam?: string[]; error?: string }> => {
    // Generate all possible name variations for each champion
    const winningVariations = winningTeamOriginal.map(name => getChampionNameVariations(name));
    const losingVariations = losingTeamOriginal.map(name => getChampionNameVariations(name));

    const maxAttempts = 50;
    let attemptCount = 0;

    const tryNextCombination = async (
      winningIndices: number[],
      losingIndices: number[]
    ): Promise<{ success: boolean; response?: any; winningTeam?: string[]; losingTeam?: string[]; error?: string }> => {
      if (attemptCount >= maxAttempts) {
        return { success: false, error: 'Maximum retry attempts reached' };
      }

      attemptCount++;

      const winningTeam = winningIndices.map((idx, i) => winningVariations[i][idx]);
      const losingTeam = losingIndices.map((idx, i) => losingVariations[i][idx]);

      console.log(`🔄 Composition attempt ${attemptCount}:`, { winningTeam, losingTeam });

      try {
        const response = await apiService.getTeamComposition(winningTeam, losingTeam, 'all');
        console.log(`✅ Composition success on attempt ${attemptCount}!`);
        return { success: true, response, winningTeam, losingTeam };
      } catch (err: any) {
        if (err.status === 429 || err.message.includes('rate limit') || err.message.includes('Too Many Requests')) {
          console.error('⚠️ Rate limit hit, stopping composition retries');
          return { success: false, error: 'Rate limit reached' };
        }

        if (err.status === 404 || err.message.includes('not found')) {
          // Extract champion name from error message
          const championMatch = err.message.match(/Champion '([^']+)' not found/);
          const notFoundChampion = championMatch ? championMatch[1] : 'unknown';
          
          console.log(`❌ Composition attempt ${attemptCount} failed: Champion '${notFoundChampion}' not found (tried: ${winningTeam.join(', ')} vs ${losingTeam.join(', ')})`);
          
          const nextCombination = getNextCombinationHelper(winningIndices, losingIndices, winningVariations, losingVariations);
          
          if (nextCombination) {
            return await tryNextCombination(nextCombination.winningIndices, nextCombination.losingIndices);
          } else {
            return { success: false, error: `Could not resolve champion names after ${attemptCount} attempts. Last failed champion: '${notFoundChampion}'` };
          }
        }

        console.error('❌ Non-retryable composition error:', err);
        return { success: false, error: err.message };
      }
    };

    const getNextCombinationHelper = (
      winningIndices: number[],
      losingIndices: number[],
      winningVars: string[][],
      losingVars: string[][]
    ): { winningIndices: number[]; losingIndices: number[] } | null => {
      const newWinningIndices = [...winningIndices];
      for (let i = newWinningIndices.length - 1; i >= 0; i--) {
        if (newWinningIndices[i] < winningVars[i].length - 1) {
          newWinningIndices[i]++;
          return { winningIndices: newWinningIndices, losingIndices };
        } else {
          newWinningIndices[i] = 0;
        }
      }

      const newLosingIndices = [...losingIndices];
      for (let i = newLosingIndices.length - 1; i >= 0; i--) {
        if (newLosingIndices[i] < losingVars[i].length - 1) {
          newLosingIndices[i]++;
          return { winningIndices: Array(winningIndices.length).fill(0), losingIndices: newLosingIndices };
        } else {
          newLosingIndices[i] = 0;
        }
      }

      return null;
    };

    const initialWinningIndices = Array(winningTeamOriginal.length).fill(0);
    const initialLosingIndices = Array(losingTeamOriginal.length).fill(0);

    return await tryNextCombination(initialWinningIndices, initialLosingIndices);
  };

  const loadMatchPrediction = async (participants: MatchParticipant[]) => {
    if (participants.length === 0) {
      console.warn('⚠️ No participants available for prediction');
      return;
    }

    setLoadingStates(prev => ({ ...prev, prediction: true }));
    setError(null); // Clear any previous errors

    try {
      // Split into teams by win/loss status (get original names)
      const winningTeamOriginal = participants.filter(p => p.win === true).map(p => p.championName);
      const losingTeamOriginal = participants.filter(p => p.win === false).map(p => p.championName);

      console.log('🔍 Original teams:', { winningTeamOriginal, losingTeamOriginal });

      if (winningTeamOriginal.length === 0 || losingTeamOriginal.length === 0) {
        console.warn('⚠️ Invalid team composition for prediction');
        setError('Invalid team composition - no winners or losers found');
        return;
      }

      if (winningTeamOriginal.length !== losingTeamOriginal.length) {
        console.warn('⚠️ Unequal team sizes for prediction');
        setError(`Unequal team sizes: ${winningTeamOriginal.length}v${losingTeamOriginal.length}`);
        return;
      }

      if (winningTeamOriginal.length !== 5 || losingTeamOriginal.length !== 5) {
        console.warn('⚠️ Match prediction only supports 5v5 matches');
        setError(`Match prediction only supports 5v5 matches. This match has ${winningTeamOriginal.length}v${losingTeamOriginal.length} teams.`);
        return;
      }

      // Check if it's Classic game mode
      if (matchDetails?.match_info?.gameMode !== 'CLASSIC') {
        console.warn('⚠️ Match prediction only supports Classic game mode');
        setError(`Match prediction only supports Classic game mode. This match is ${matchDetails?.match_info?.gameMode || 'Unknown'} mode.`);
        return;
      }

      // Try to get prediction with smart name resolution
      const result = await tryPredictionWithNameResolution(winningTeamOriginal, losingTeamOriginal);
      
      if (result.success && result.winningTeam && result.losingTeam) {
        console.log('✅ Match prediction analysis loaded:', result.response);
        setMatchPrediction(result.response);

        // Cache for 30 minutes using the successful names
        const cacheKey = `match_prediction_${result.winningTeam.sort().join('_')}_vs_${result.losingTeam.sort().join('_')}`;
        cache.set(cacheKey, result.response, 30);
      } else {
        throw new Error(result.error || 'Failed to resolve champion names');
      }

    } catch (err: any) {
      console.error('❌ Failed to load match prediction:', err);
      setError(`Failed to load match prediction: ${err.message}`);
    } finally {
      setLoadingStates(prev => ({ ...prev, prediction: false }));
    }
  };

  const loadMatchTimeline = async (matchId: string) => {
    if (!userCredentials) return;

    setLoadingStates(prev => ({ ...prev, timeline: true }));

    try {
      // Check cache first
      const cacheKey = CACHE_KEYS.MATCH_TIMELINE(matchId);
      let cachedTimeline = cache.get<MatchTimeline>(cacheKey);

      if (cachedTimeline) {
        console.log(`✅ Using cached match timeline for ${matchId}`);
        setMatchTimeline(cachedTimeline);
      } else {
        console.log(`🔄 Loading match timeline for ${matchId}...`);
        const response = await apiService.getMatchTimeline(matchId, userCredentials.region);
        console.log('✅ Match timeline loaded:', response);

        setMatchTimeline(response);

        // Cache for 60 minutes
        cache.set(cacheKey, response, 60);
      }

    } catch (err: any) {
      console.error('❌ Failed to load match timeline:', err);
      // Don't set error for timeline as it's not critical
    } finally {
      setLoadingStates(prev => ({ ...prev, timeline: false }));
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMapName = (mapId: number) => {
    const mapNames: Record<number, string> = {
      1: "Summoner's Rift (Original Summer)",
      2: "Summoner's Rift (Original Autumn)",
      3: "The Proving Grounds",
      4: "Twisted Treeline (Original)",
      8: "The Crystal Scar",
      10: "Twisted Treeline (Last)",
      11: "Summoner's Rift",
      12: "Howling Abyss",
      14: "Butcher's Bridge",
      16: "Cosmic Ruins",
      18: "Valoran City Park",
      19: "Substructure 43",
      20: "Crash Site",
      21: "Nexus Blitz",
      22: "Convergence",
      30: "Rings of Wrath"
    };
    return mapNames[mapId] || `Unknown Map (ID: ${mapId})`;
  };

  const formatChampionName = (championName: string) => {
    // Handle special cases first
    const specialCases: Record<string, string> = {
      'MissFortune': 'Miss Fortune',
      'FiddleSticks': 'Fiddlesticks',
      'DrMundo': 'Dr. Mundo',
      'JarvanIV': 'Jarvan IV',
      'KhaZix': "Kha'Zix",
      'KogMaw': "Kog'Maw",
      'LeBlanc': 'LeBlanc',
      'LeeSin': 'Lee Sin',
      'MasterYi': 'Master Yi',
      'RekSai': "Rek'Sai",
      'TahmKench': 'Tahm Kench',
      'TwistedFate': 'Twisted Fate',
      'VelKoz': "Vel'Koz",
      'XinZhao': 'Xin Zhao',
      'AurelionSol': 'Aurelion Sol',
      'Wukong': 'Wukong',
      'Nunu': 'Nunu & Willump',
      'RenataGlasc': 'Renata Glasc'
    };

    if (specialCases[championName]) {
      return specialCases[championName];
    }

    // For other champions, add spaces before capital letters (except the first one)
    return championName.replace(/([a-z])([A-Z])/g, '$1 $2');
  };

  if (!userData || !userCredentials) {
    return (
      <div className="match-history-page">
        <div className="match-history-header">
          <div className="header-content">
            <img src={logo} alt="Rift Rewind" className="header-logo" />
            <button onClick={onBack} className="back-button">
              Back to Dashboard
            </button>
            <div className="header-center">
              <h2>📊 Match History</h2>
            </div>
            <div className="header-spacer"></div>
          </div>
        </div>
        <div className="error-state">
          <p>{error || 'Loading user data...'}</p>
          <button onClick={onBack}>Return to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="match-history-page">
      <div className="match-history-header">
        <div className="header-content">
          <img src={logo} alt="Rift Rewind" className="header-logo" />
          <button onClick={onBack} className="back-button">
            Back to Dashboard
          </button>
          <div className="header-center">
            <h2>📊 Match History</h2>
            <p className="user-info">{userData.gameName}#{userData.tagLine}</p>
          </div>
          <div className="header-spacer"></div>
        </div>
      </div>

      <div className="match-history-content">
        {loading && (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading match history...</p>
          </div>
        )}

        {error && (
          <div className="error-state">
            <p>{error}</p>
            <button onClick={() => loadMatchHistory()}>
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {!showDetails && (
              <div className="match-history-section">
                <div className="match-history-info">
                  <span className="results-count">
                    Showing {matchHistory.length} recent matches (Most recent to oldest)
                  </span>
                </div>

                <div className="match-history-list">
                  {matchHistory.length > 0 ? matchHistory.map((matchId, index) => (
                    <div
                      key={matchId}
                      className={`match-item ${index % 2 === 0 ? 'even' : 'odd'}`}
                      onClick={() => selectMatch(matchId)}
                    >
                      <div className="match-basic-info">
                        <div className="match-id">
                          <span className="match-label">Match ID</span>
                          <span className="match-id-short">{matchId.slice(-8)}</span>
                        </div>
                        <div className="match-info">
                          <span className="match-full-id">{matchId}</span>
                        </div>
                      </div>
                      <div className="match-actions">
                        <button className="view-details-button">
                          View Details →
                        </button>
                      </div>
                    </div>
                  )) : (
                    <div className="no-results">
                      <div className="no-results-content">
                        <span className="no-results-icon">🎮</span>
                        <span className="no-results-text">No matches found</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {showDetails && selectedMatch && (
              <div className="match-details-section">
                <div className="match-details-header">
                  <h3>Match Details: {selectedMatch.slice(-8)}</h3>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="back-to-history-button"
                  >
                    Back to History
                  </button>
                </div>

                {loadingStates.details && (
                  <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <p>Loading match details...</p>
                  </div>
                )}

                {matchDetails && (
                  <div className="match-info-card">
                    <div className="match-info-header">
                      <h4>Match Information</h4>
                    </div>
                    <div className="match-info-content">
                      <div className="info-row">
                        <span className="info-label">Game Mode:</span>
                        <span className="info-value">{matchDetails.match_info.gameMode || 'Classic'}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Game Type:</span>
                        <span className="info-value">{matchDetails.match_info.gameType || 'N/A'}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Duration:</span>
                        <span className="info-value">{formatDuration(matchDetails.match_info.gameDuration || 0)}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Date:</span>
                        <span className="info-value">{formatDate(matchDetails.match_info.gameCreation || 0)}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Game Version:</span>
                        <span className="info-value">{matchDetails.match_info.gameVersion || 'N/A'}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Region:</span>
                        <span className="info-value">{userCredentials?.region || 'N/A'}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Platform:</span>
                        <span className="info-value">{matchDetails.match_info.platformId || 'N/A'}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Queue ID:</span>
                        <span className="info-value">{matchDetails.match_info.queueId || 'N/A'}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Map:</span>
                        <span className="info-value">{getMapName(matchDetails.match_info.mapId) || 'N/A'}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">End Result:</span>
                        <span className="info-value">{matchDetails.match_info.endOfGameResult || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {loadingStates.participants && (
                  <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <p>Loading participants...</p>
                  </div>
                )}

                {matchParticipants.length > 0 && (
                  <div className="participants-section">
                    <div className="teams-container">
                      {/* Winning Team */}
                      <div className="team-section blue-team">
                        <h4>Winning Team</h4>
                        <div className="participants-table">
                          <div className="table-header">
                            <div className="table-cell">Champion</div>
                            <div className="table-cell">KDA</div>
                            <div className="table-cell">Gold</div>
                            <div className="table-cell">CS</div>
                            <div className="table-cell">Result</div>
                          </div>
                          {matchParticipants
                            .filter(p => p.win === true)
                            .map((participant, index) => (
                              <div key={index} className={`table-row ${index % 2 === 0 ? 'even' : 'odd'}`}>
                                <div className="table-cell champion-cell">
                                  <img
                                    src={`https://ddragon.leagueoflegends.com/cdn/14.22.1/img/champion/${formatChampionName(participant.championName)}.png`}
                                    alt={formatChampionName(participant.championName)}
                                    className="champion-icon"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = '/champion-placeholder.png';
                                    }}
                                  />
                                  <span className="champion-name">{formatChampionName(participant.championName)}</span>
                                </div>
                                <div className="table-cell">
                                  <span className="kda">
                                    {participant.kills}/{participant.deaths}/{participant.assists}
                                  </span>
                                </div>
                                <div className="table-cell">
                                  <span className="gold">{participant.goldEarned.toLocaleString()}</span>
                                </div>
                                <div className="table-cell">
                                  <span className="cs">{participant.totalMinionsKilled}</span>
                                </div>
                                <div className="table-cell">
                                  <span className={`result ${participant.win ? 'win' : 'loss'}`}>
                                    {participant.win ? 'Victory' : 'Defeat'}
                                  </span>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Losing Team */}
                      <div className="team-section red-team">
                        <h4>Losing Team</h4>
                        <div className="participants-table">
                          <div className="table-header">
                            <div className="table-cell">Champion</div>
                            <div className="table-cell">KDA</div>
                            <div className="table-cell">Gold</div>
                            <div className="table-cell">CS</div>
                            <div className="table-cell">Result</div>
                          </div>
                          {matchParticipants
                            .filter(p => p.win === false)
                            .map((participant, index) => (
                              <div key={index} className={`table-row ${index % 2 === 0 ? 'even' : 'odd'}`}>
                                <div className="table-cell champion-cell">
                                  <img
                                    src={`https://ddragon.leagueoflegends.com/cdn/14.22.1/img/champion/${formatChampionName(participant.championName)}.png`}
                                    alt={formatChampionName(participant.championName)}
                                    className="champion-icon"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = '/champion-placeholder.png';
                                    }}
                                  />
                                  <span className="champion-name">{formatChampionName(participant.championName)}</span>
                                </div>
                                <div className="table-cell">
                                  <span className="kda">
                                    {participant.kills}/{participant.deaths}/{participant.assists}
                                  </span>
                                </div>
                                <div className="table-cell">
                                  <span className="gold">{participant.goldEarned.toLocaleString()}</span>
                                </div>
                                <div className="table-cell">
                                  <span className="cs">{participant.totalMinionsKilled}</span>
                                </div>
                                <div className="table-cell">
                                  <span className={`result ${participant.win ? 'win' : 'loss'}`}>
                                    {participant.win ? 'Victory' : 'Defeat'}
                                  </span>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>

                    {/* Match Prediction Button */}
                    <div className="prediction-button-section">
                      {(() => {
                        const winningTeam = matchParticipants.filter(p => p.win === true);
                        const losingTeam = matchParticipants.filter(p => p.win === false);
                        const isCorrectTeamSize = winningTeam.length === 5 && losingTeam.length === 5;
                        const isClassicMode = matchDetails?.match_info?.gameMode === 'CLASSIC';
                        const isValidForPrediction = isCorrectTeamSize && isClassicMode;

                        return (
                          <>
                            <button
                              onClick={() => loadMatchPrediction(matchParticipants)}
                              disabled={loadingStates.prediction || matchParticipants.length === 0 || !isValidForPrediction}
                              className={`prediction-button ${!isValidForPrediction ? 'disabled-non-5v5' : ''}`}
                            >
                              {loadingStates.prediction ? (
                                <>
                                  <div className="loading-spinner-small"></div>
                                  Analyzing Match...
                                </>
                              ) : !isValidForPrediction ? (
                                <>
                                  🚫 Prediction Not Available
                                </>
                              ) : (
                                <>
                                  🔮 Get AI Match Prediction
                                </>
                              )}
                            </button>
                            <p className="prediction-button-description">
                              {!isValidForPrediction ? (
                                <>
                                  AI match prediction is only available for 5v5 Classic matches.
                                  {!isCorrectTeamSize && (
                                    <> This match has {winningTeam.length}v{losingTeam.length} teams.</>
                                  )}
                                  {!isClassicMode && (
                                    <> This match is {matchDetails?.match_info?.gameMode || 'Unknown'} mode.</>
                                  )}
                                </>
                              ) : (
                                <>
                                  Get prediction analysis for this match using the actual teams that played
                                </>
                              )}
                            </p>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {loadingStates.composition && (
                  <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <p>Loading team composition analysis...</p>
                  </div>
                )}

                {teamComposition && (
                  <div className="team-composition-section">
                    <div className="composition-header">
                      <h4>Team Composition Analysis of winning team</h4>
                      <p className="composition-archetype">
                        <strong>{teamComposition.team_composition.archetype}</strong> - {teamComposition.team_composition.archetype_description}
                      </p>
                    </div>

                    <div className="composition-stats">
                      <div className="stats-grid">
                        <div className="stat-item">
                          <span className="stat-label">Attack</span>
                          <span className="stat-value">{teamComposition.team_stats.averages.attack}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Defense</span>
                          <span className="stat-value">{teamComposition.team_stats.averages.defense}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Magic</span>
                          <span className="stat-value">{teamComposition.team_stats.averages.magic}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Difficulty</span>
                          <span className="stat-value">{teamComposition.team_stats.averages.difficulty}</span>
                        </div>
                      </div>
                    </div>

                    <div className="composition-analysis">
                      <div className="analysis-section">
                        <h5>Strengths</h5>
                        <ul>
                          {teamComposition.analysis.strengths.map((strength, index) => (
                            <li key={index}>{strength}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="analysis-section">
                        <h5>Weaknesses</h5>
                        <ul>
                          {teamComposition.analysis.weaknesses.map((weakness, index) => (
                            <li key={index}>{weakness}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="analysis-section">
                        <h5>Strategic Recommendations</h5>
                        <ul>
                          {teamComposition.strategic_recommendations.map((recommendation, index) => (
                            <li key={index}>{recommendation}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {loadingStates.prediction && (
                  <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <p>Loading match prediction...</p>
                  </div>
                )}

                {matchPrediction && (
                  <div className="prediction-section">
                    <div className="prediction-header">
                      <h4>Match Prediction Analysis</h4>
                      <p className="prediction-subtitle">
                        AI-powered analysis based on the actual teams that played
                      </p>
                    </div>

                    <div className="prediction-results">
                      <div className="prediction-summary">
                        <div className="win-probabilities">
                          <div className="probability blue">
                            <span className="team-name">Winning Team</span>
                            <span className="percentage">{matchPrediction.prediction.blue_team_win_probability}%</span>
                            <span className="team-subtitle">Prediction</span>
                          </div>
                          <div className="probability red">
                            <span className="team-name">Losing Team</span>
                            <span className="percentage">{matchPrediction.prediction.red_team_win_probability}%</span>
                            <span className="team-subtitle">Prediction</span>
                          </div>
                        </div>
                        <div className="predicted-winner">
                          <strong>AI Predicted Winner: {matchPrediction.prediction.predicted_winner}</strong>
                          <br />
                          <span className={`actual-result ${
                            matchPrediction.prediction.predicted_winner === 'Blue Team' ? 'correct' : 'incorrect'
                          }`}>
                            {matchPrediction.prediction.predicted_winner === 'Blue Team' 
                              ? '✅ Prediction was CORRECT!' 
                              : '❌ Prediction was WRONG - Blue Team actually won'
                            }
                          </span>
                        </div>
                      </div>

                      <div className="team-analysis">
                        <div className="analysis-section">
                          <h5>Winning Team Analysis</h5>
                          <div className="team-stats">
                            <div className="stat-item">
                              <span>Attack: {matchPrediction.team_analysis.blue_team.composition_score.attack}</span>
                            </div>
                            <div className="stat-item">
                              <span>Defense: {matchPrediction.team_analysis.blue_team.composition_score.defense}</span>
                            </div>
                            <div className="stat-item">
                              <span>Magic: {matchPrediction.team_analysis.blue_team.composition_score.magic}</span>
                            </div>
                            <div className="stat-item">
                              <span>Synergy: {matchPrediction.team_analysis.blue_team.composition_score.synergy}</span>
                            </div>
                          </div>
                          <div className="strengths-weaknesses">
                            {matchPrediction.team_analysis.blue_team.strengths.length > 0 && (
                              <div className="strengths">
                                <h6>Strengths:</h6>
                                <ul>
                                  {matchPrediction.team_analysis.blue_team.strengths.map((strength: string, index: number) => (
                                    <li key={index}>{strength}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {matchPrediction.team_analysis.blue_team.weaknesses.length > 0 && (
                              <div className="weaknesses">
                                <h6>Weaknesses:</h6>
                                <ul>
                                  {matchPrediction.team_analysis.blue_team.weaknesses.map((weakness: string, index: number) => (
                                    <li key={index}>{weakness}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="analysis-section">
                          <h5>Losing Team Analysis</h5>
                          <div className="team-stats">
                            <div className="stat-item">
                              <span>Attack: {matchPrediction.team_analysis.red_team.composition_score.attack}</span>
                            </div>
                            <div className="stat-item">
                              <span>Defense: {matchPrediction.team_analysis.red_team.composition_score.defense}</span>
                            </div>
                            <div className="stat-item">
                              <span>Magic: {matchPrediction.team_analysis.red_team.composition_score.magic}</span>
                            </div>
                            <div className="stat-item">
                              <span>Synergy: {matchPrediction.team_analysis.red_team.composition_score.synergy}</span>
                            </div>
                          </div>
                          <div className="strengths-weaknesses">
                            {matchPrediction.team_analysis.red_team.strengths.length > 0 && (
                              <div className="strengths">
                                <h6>Strengths:</h6>
                                <ul>
                                  {matchPrediction.team_analysis.red_team.strengths.map((strength: string, index: number) => (
                                    <li key={index}>{strength}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {matchPrediction.team_analysis.red_team.weaknesses.length > 0 && (
                              <div className="weaknesses">
                                <h6>Weaknesses:</h6>
                                <ul>
                                  {matchPrediction.team_analysis.red_team.weaknesses.map((weakness: string, index: number) => (
                                    <li key={index}>{weakness}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="disclaimer">
                        <p>{matchPrediction.disclaimer}</p>
                      </div>
                    </div>
                  </div>
                )}

                {loadingStates.timeline && (
                  <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <p>Loading match timeline...</p>
                  </div>
                )}

                {matchTimeline && (
                  <div className="timeline-section">
                    <div className="timeline-header">
                      <h4>Match Timeline</h4>
                      <p className="timeline-summary">
                        {matchTimeline.summary.total_frames} frames • {matchTimeline.summary.total_kills} kills •
                        {matchTimeline.summary.total_item_events} item events • {matchTimeline.summary.total_ward_events} ward events • {matchTimeline.summary.total_objective_events} objectives
                      </p>
                    </div>

                    <div className="timeline-stats">
                      <div className="stats-grid">
                        <div className="stat-item">
                          <span className="stat-label">Game Duration</span>
                          <span className="stat-value">{formatDuration(matchTimeline.game_duration / 1000)}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Total Frames</span>
                          <span className="stat-value">{matchTimeline.summary.total_frames}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Total Kills</span>
                          <span className="stat-value">{matchTimeline.summary.total_kills}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Item Events</span>
                          <span className="stat-value">{matchTimeline.summary.total_item_events}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Ward Events</span>
                          <span className="stat-value">{matchTimeline.summary.total_ward_events}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Objectives</span>
                          <span className="stat-value">{matchTimeline.summary.total_objective_events}</span>
                        </div>
                      </div>
                    </div>

                    <div className="timeline-frames">
                      <h5>Key Events by Minute</h5>
                      <div className="frames-list">
                        {matchTimeline.frames.map((frame, index) => (
                          <div key={index} className="frame-item">
                            <div className="frame-time">
                              <span className="minute">{frame.minute}:00</span>
                            </div>
                            <div className="frame-events">
                              {frame.events.kills.length > 0 && (
                                <div className="event-group">
                                  <span className="event-type">Kills: {frame.events.kills.length}</span>
                                </div>
                              )}
                              {frame.events.objective_events.length > 0 && (
                                <div className="event-group">
                                  <span className="event-type">Objectives: {frame.events.objective_events.length}</span>
                                </div>
                              )}
                              {frame.events.item_events.length > 0 && (
                                <div className="event-group">
                                  <span className="event-type">Items: {frame.events.item_events.length}</span>
                                </div>
                              )}
                              {frame.events.ward_events && frame.events.ward_events.length > 0 && (
                                <div className="event-group">
                                  <span className="event-type">Wards: {frame.events.ward_events.length}</span>
                                </div>
                              )}
                              {frame.events.kills.length === 0 && frame.events.objective_events.length === 0 && frame.events.item_events.length === 0 && (!frame.events.ward_events || frame.events.ward_events.length === 0) && (
                                <div className="event-group">
                                  <span className="event-type quiet">No major events</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
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
