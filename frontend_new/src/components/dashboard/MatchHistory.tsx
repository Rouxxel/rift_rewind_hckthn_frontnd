import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { cache, CACHE_KEYS } from '../../utils/cache';

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
    localStorage.setItem('rift_rewind_current_match_id', matchId);
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
      const cachedDetails = cache.get<any>(cacheKey);

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
      const cachedParticipants = cache.get<MatchParticipant[]>(cacheKey);

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

    // 1. Original name (as-is from Riot API)
    variations.push(championName);

    // 2. Remove all spaces and special characters (compact form)
    const compact = championName.replace(/[\s'.-]/g, '');
    if (compact !== championName && !variations.includes(compact)) {
      variations.push(compact);
    }

    // 3. Split by capitals: "MissFortune" -> "Miss Fortune"
    const splitName = splitByCapitals(championName);
    if (splitName !== championName && !variations.includes(splitName)) {
      variations.push(splitName);
    }

    // 4. Add apostrophes between lowercase and uppercase: "KSante" -> "K'Sante"
    const apostropheName = addApostrophes(championName);
    if (apostropheName !== championName && !variations.includes(apostropheName)) {
      variations.push(apostropheName);
    }

    // 5. Split by capitals then add apostrophes: "K Sante" -> "K'Sante"
    if (splitName !== championName) {
      const splitWithApostrophe = splitName.replace(/\s+/g, "'");
      if (!variations.includes(splitWithApostrophe)) {
        variations.push(splitWithApostrophe);
      }
    }

    // 6. Common special cases
    const specialCases: Record<string, string[]> = {
      'Velkoz': ['Vel\'Koz', 'VelKoz', 'Vel Koz'],
      'VelKoz': ['Vel\'Koz', 'Velkoz', 'Vel Koz'],
      'KSante': ['K\'Sante', 'KSante', 'K Sante'],
      'KhaZix': ['Kha\'Zix', 'KhaZix', 'Kha Zix'],
      'RekSai': ['Rek\'Sai', 'RekSai', 'Rek Sai'],
      'ChoGath': ['Cho\'Gath', 'ChoGath', 'Cho Gath'],
      'KogMaw': ['Kog\'Maw', 'KogMaw', 'Kog Maw'],
      'LeBlanc': ['LeBlanc', 'Leblanc', 'Le Blanc'],
      'MissFortune': ['Miss Fortune', 'MissFortune'],
      'MasterYi': ['Master Yi', 'MasterYi'],
      'TahmKench': ['Tahm Kench', 'TahmKench'],
      'TwistedFate': ['Twisted Fate', 'TwistedFate'],
      'XinZhao': ['Xin Zhao', 'XinZhao'],
      'JarvanIV': ['Jarvan IV', 'JarvanIV', 'Jarvan4'],
      'LeeSin': ['Lee Sin', 'LeeSin'],
      'AurelionSol': ['Aurelion Sol', 'AurelionSol'],
      'DrMundo': ['Dr. Mundo', 'DrMundo', 'Dr Mundo'],
      'Yunara': ['Yunara', 'Yuumi'], // In case of typos
    };

    const normalizedName = championName.replace(/[\s'.-]/g, '');
    if (specialCases[normalizedName]) {
      specialCases[normalizedName].forEach(variant => {
        if (!variations.includes(variant)) {
          variations.push(variant);
        }
      });
    }

    console.log(`🔍 Generated ${variations.length} variations for "${championName}":`, variations);
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
        <div className="error-state">
          <p>{error || 'Loading user data...'}</p>
          <button onClick={onBack}>Return to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="match-history-page">
      {showDetails && selectedMatch && (
        <div className="container pt-4">
          <button
            onClick={() => {
              setShowDetails(false);
              setSelectedMatch(null);
            }}
            className="font-pixel text-[10px] uppercase tracking-widest text-primary hover:text-primary-glow"
          >
            ◀ Back to Matches
          </button>
        </div>
      )}

      <div className="match-history-content">
        <div className="container py-6 space-y-6">
          {/* Page heading */}
          <div className="panel-bevel rounded-sm p-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h2 className="font-blackletter text-2xl md:text-3xl text-primary text-glow m-0">
                {showDetails && selectedMatch ? "Match Details" : "Match History"}
              </h2>
              <p className="font-pixel text-[10px] uppercase tracking-[0.18em] text-ink/70 mt-2">
                {showDetails && selectedMatch
                  ? `Match ID · ${selectedMatch.slice(-8)}`
                  : `${userData.gameName}#${userData.tagLine}`}
              </p>
            </div>
            {!showDetails && (
              <span className="font-pixel text-[10px] uppercase tracking-[0.18em] text-gold self-start sm:self-end">
                {matchHistory.length} recent matches
              </span>
            )}
          </div>

          {loading && (
            <div className="panel-bevel rounded-sm p-8 flex flex-col items-center gap-3">
              <div className="loading-spinner" />
              <p className="font-pixel text-[10px] uppercase tracking-widest text-ink/70 m-0">
                Loading match history...
              </p>
            </div>
          )}

          {error && (
            <div className="panel-bevel rounded-sm p-6 flex flex-col items-center gap-3 border-danger/60">
              <p className="font-display text-sm text-danger m-0 text-center">{error}</p>
              <button
                onClick={() => loadMatchHistory()}
                className="px-4 py-2 rounded-sm border border-primary/70 bg-surface-inset text-primary font-pixel text-[10px] uppercase tracking-[0.18em] hover:bg-primary/10 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && !showDetails && (
            <div className="panel-bevel rounded-sm p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-primary/25">
                <h3 className="font-blackletter text-lg text-primary text-glow m-0">
                  ◆ Recent Matches
                </h3>
                <span className="font-pixel text-[9px] uppercase tracking-[0.18em] text-ink/60">
                  Newest first
                </span>
              </div>

              {matchHistory.length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {matchHistory.map((matchId) => (
                    <button
                      key={matchId}
                      onClick={() => selectMatch(matchId)}
                      className="group panel-bevel rounded-sm p-3 flex items-center justify-between gap-3 text-left transition-all duration-200 hover:border-primary hover:shadow-halo hover:-translate-y-0.5"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 shrink-0 rounded-sm border border-primary/50 bg-surface-inset/70 flex items-center justify-center font-pixel text-[10px] text-primary">
                          ID
                        </div>
                        <div className="min-w-0">
                          <div className="font-blackletter text-base text-primary text-glow truncate">
                            #{matchId.slice(-8)}
                          </div>
                          <div className="font-pixel text-[9px] uppercase tracking-[0.14em] text-ink/55 truncate">
                            {matchId}
                          </div>
                        </div>
                      </div>
                      <span className="shrink-0 font-pixel text-[9px] uppercase tracking-[0.18em] text-primary group-hover:text-primary-glow">
                        View ▸
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="panel-bevel rounded-sm p-8 flex flex-col items-center gap-2">
                  <span className="text-2xl">🎮</span>
                  <span className="font-pixel text-[10px] uppercase tracking-[0.18em] text-ink/60">
                    No matches found
                  </span>
                </div>
              )}
            </div>
          )}

          {!loading && !error && showDetails && selectedMatch && (
            <div className="space-y-6">
              {loadingStates.details && (
                <div className="panel-bevel rounded-sm p-6 flex flex-col items-center gap-3">
                  <div className="loading-spinner" />
                  <p className="font-pixel text-[10px] uppercase tracking-widest text-ink/70 m-0">
                    Loading match details...
                  </p>
                </div>
              )}

              {matchDetails && (
                <section className="panel-bevel rounded-sm p-5">
                  <h4 className="font-blackletter text-lg text-primary text-glow m-0 pb-2 mb-3 border-b border-primary/25">
                    ◆ Match Information
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 border border-border/60 rounded-sm overflow-hidden">
                    {[
                      ["Game Mode", matchDetails.match_info.gameMode || "Classic"],
                      ["Game Type", matchDetails.match_info.gameType || "N/A"],
                      ["Duration", formatDuration(matchDetails.match_info.gameDuration || 0)],
                      ["Date", formatDate(matchDetails.match_info.gameCreation || 0)],
                      ["Game Version", matchDetails.match_info.gameVersion || "N/A"],
                      ["Region", userCredentials?.region || "N/A"],
                      ["Platform", matchDetails.match_info.platformId || "N/A"],
                      ["Queue ID", String(matchDetails.match_info.queueId ?? "N/A")],
                      ["Map", getMapName(matchDetails.match_info.mapId) || "N/A"],
                      ["End Result", matchDetails.match_info.endOfGameResult || "N/A"],
                    ].map(([label, value], idx) => (
                      <div
                        key={label as string}
                        className={`flex items-center justify-between gap-3 px-3 py-2 border-b border-border/40 ${
                          idx % 2 === 0 ? "bg-surface-inset/40" : ""
                        }`}
                      >
                        <span className="font-pixel text-[9px] uppercase tracking-[0.16em] text-ink/65">
                          {label}
                        </span>
                        <span className="font-display text-sm text-ink truncate">{value}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {loadingStates.participants && (
                <div className="panel-bevel rounded-sm p-6 flex flex-col items-center gap-3">
                  <div className="loading-spinner" />
                  <p className="font-pixel text-[10px] uppercase tracking-widest text-ink/70 m-0">
                    Loading participants...
                  </p>
                </div>
              )}

              {matchParticipants.length > 0 && (
                <section className="space-y-4">
                  {[
                    { label: "Winning Team", participants: matchParticipants.filter((p) => p.win), accent: "primary" as const },
                    { label: "Losing Team", participants: matchParticipants.filter((p) => !p.win), accent: "danger" as const },
                  ].map(({ label, participants, accent }) => (
                    <div key={label} className="panel-bevel rounded-sm p-4 sm:p-5">
                      <div className="flex items-center justify-between pb-2 mb-3 border-b border-primary/25">
                        <h4 className="font-blackletter text-lg text-primary text-glow m-0">◆ {label}</h4>
                        <span
                          className={`font-pixel text-[9px] uppercase tracking-[0.18em] px-2 py-1 rounded-sm border ${
                            accent === "primary"
                              ? "text-success border-success/50 bg-success/10"
                              : "text-danger border-danger/50 bg-danger/10"
                          }`}
                        >
                          {accent === "primary" ? "Victory" : "Defeat"}
                        </span>
                      </div>

                      <div className="border border-border/60 rounded-sm overflow-x-auto">
                        <div className="grid grid-cols-[2fr_1fr_1fr_0.7fr_0.9fr] min-w-[520px] bg-surface-inset/70 px-3 py-2 border-b border-border/60">
                          {["Champion", "KDA", "Gold", "CS", "Result"].map((h) => (
                            <span
                              key={h}
                              className="font-pixel text-[9px] uppercase tracking-[0.16em] text-primary"
                            >
                              {h}
                            </span>
                          ))}
                        </div>
                        {participants.map((participant, i) => (
                          <div
                            key={i}
                            className={`grid grid-cols-[2fr_1fr_1fr_0.7fr_0.9fr] min-w-[520px] items-center px-3 py-2 border-b border-border/40 last:border-b-0 ${
                              i % 2 === 0 ? "bg-surface-inset/30" : ""
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={`https://ddragon.leagueoflegends.com/cdn/14.22.1/img/champion/${formatChampionName(participant.championName)}.png`}
                                alt={formatChampionName(participant.championName)}
                                className="h-8 w-8 rounded-sm border border-primary/50 object-cover shrink-0"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "/champion-placeholder.png";
                                }}
                              />
                              <span className="font-display text-sm text-ink truncate">
                                {formatChampionName(participant.championName)}
                              </span>
                            </div>
                            <span className="font-pixel text-[10px] text-ink">
                              {participant.kills}/{participant.deaths}/{participant.assists}
                            </span>
                            <span className="font-pixel text-[10px] text-gold">
                              {participant.goldEarned.toLocaleString()}
                            </span>
                            <span className="font-pixel text-[10px] text-ink">
                              {participant.totalMinionsKilled}
                            </span>
                            <span
                              className={`font-pixel text-[9px] uppercase tracking-[0.14em] ${
                                participant.win ? "text-success" : "text-danger"
                              }`}
                            >
                              {participant.win ? "Victory" : "Defeat"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Match Prediction Button */}
                  <div className="panel-bevel rounded-sm p-5 flex flex-col items-center gap-3 text-center">
                    {(() => {
                      const winningTeam = matchParticipants.filter((p) => p.win === true);
                      const losingTeam = matchParticipants.filter((p) => p.win === false);
                      const isCorrectTeamSize = winningTeam.length === 5 && losingTeam.length === 5;
                      const isClassicMode = matchDetails?.match_info?.gameMode === "CLASSIC";
                      const isValidForPrediction = isCorrectTeamSize && isClassicMode;
                      const disabled = loadingStates.prediction || matchParticipants.length === 0 || !isValidForPrediction;
                      return (
                        <>
                          <button
                            onClick={() => loadMatchPrediction(matchParticipants)}
                            disabled={disabled}
                            className={`px-5 py-3 rounded-sm font-pixel text-[10px] uppercase tracking-[0.18em] border transition-all ${
                              disabled
                                ? "bg-surface-inset/60 border-border text-ink/50 cursor-not-allowed"
                                : "bg-gradient-coral text-primary-foreground border-primary/80 shadow-halo hover:-translate-y-0.5"
                            }`}
                          >
                            {loadingStates.prediction
                              ? "Analyzing Match..."
                              : !isValidForPrediction
                              ? "🚫 Prediction Not Available"
                              : "🔮 Get AI Match Prediction"}
                          </button>
                          <p className="font-display text-xs text-ink/70 m-0 max-w-md">
                            {!isValidForPrediction ? (
                              <>
                                AI match prediction is only available for 5v5 Classic matches.
                                {!isCorrectTeamSize && (
                                  <> This match has {winningTeam.length}v{losingTeam.length} teams.</>
                                )}
                                {!isClassicMode && (
                                  <> This match is {matchDetails?.match_info?.gameMode || "Unknown"} mode.</>
                                )}
                              </>
                            ) : (
                              <>Get prediction analysis for this match using the actual teams that played.</>
                            )}
                          </p>
                        </>
                      );
                    })()}
                  </div>
                </section>
              )}

              {loadingStates.composition && (
                <div className="panel-bevel rounded-sm p-6 flex flex-col items-center gap-3">
                  <div className="loading-spinner" />
                  <p className="font-pixel text-[10px] uppercase tracking-widest text-ink/70 m-0">
                    Loading team composition analysis...
                  </p>
                </div>
              )}

              {teamComposition && (
                <section className="panel-bevel rounded-sm p-5 space-y-4">
                  <div>
                    <h4 className="font-blackletter text-lg text-primary text-glow m-0 pb-2 border-b border-primary/25">
                      ◆ Winning Team Composition
                    </h4>
                    <p className="font-display text-sm text-ink/80 mt-3 m-0">
                      <strong className="text-primary">{teamComposition.team_composition.archetype}</strong>
                      {" — "}
                      {teamComposition.team_composition.archetype_description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      ["Attack", teamComposition.team_stats.averages.attack],
                      ["Defense", teamComposition.team_stats.averages.defense],
                      ["Magic", teamComposition.team_stats.averages.magic],
                      ["Difficulty", teamComposition.team_stats.averages.difficulty],
                    ].map(([label, value]) => (
                      <div
                        key={label as string}
                        className="panel-bevel rounded-sm p-3 flex flex-col items-center gap-1"
                      >
                        <span className="font-pixel text-[9px] uppercase tracking-[0.16em] text-ink/65">
                          {label}
                        </span>
                        <span className="font-blackletter text-xl text-primary text-glow">{value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { title: "Strengths", items: teamComposition.analysis.strengths, color: "text-success" },
                      { title: "Weaknesses", items: teamComposition.analysis.weaknesses, color: "text-danger" },
                      { title: "Strategic Recommendations", items: teamComposition.strategic_recommendations, color: "text-gold" },
                    ].map(({ title, items, color }) => (
                      <div key={title} className="panel-bevel rounded-sm p-3">
                        <h5 className={`font-pixel text-[10px] uppercase tracking-[0.16em] mb-2 ${color}`}>
                          ▸ {title}
                        </h5>
                        <ul className="space-y-1 m-0 pl-0 list-none">
                          {items.map((it, i) => (
                            <li key={i} className="font-display text-xs text-ink/80 leading-snug">
                              ◆ {it}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {loadingStates.prediction && (
                <div className="panel-bevel rounded-sm p-6 flex flex-col items-center gap-3">
                  <div className="loading-spinner" />
                  <p className="font-pixel text-[10px] uppercase tracking-widest text-ink/70 m-0">
                    Loading match prediction...
                  </p>
                </div>
              )}

              {matchPrediction && (
                <section className="panel-bevel rounded-sm p-5 space-y-4">
                  <div className="pb-2 border-b border-primary/25">
                    <h4 className="font-blackletter text-lg text-primary text-glow m-0">
                      ◆ Match Prediction Analysis
                    </h4>
                    <p className="font-pixel text-[10px] uppercase tracking-[0.16em] text-ink/65 mt-2 m-0">
                      AI-powered analysis based on the actual teams that played
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="panel-bevel rounded-sm p-4 flex flex-col items-center gap-1 border-success/40">
                      <span className="font-pixel text-[10px] uppercase tracking-[0.16em] text-success">
                        Winning Team
                      </span>
                      <span className="font-blackletter text-3xl text-success text-glow">
                        {matchPrediction.prediction.blue_team_win_probability}%
                      </span>
                      <span className="font-pixel text-[9px] uppercase tracking-[0.14em] text-ink/60">
                        Prediction
                      </span>
                    </div>
                    <div className="panel-bevel rounded-sm p-4 flex flex-col items-center gap-1 border-danger/40">
                      <span className="font-pixel text-[10px] uppercase tracking-[0.16em] text-danger">
                        Losing Team
                      </span>
                      <span className="font-blackletter text-3xl text-danger text-glow">
                        {matchPrediction.prediction.red_team_win_probability}%
                      </span>
                      <span className="font-pixel text-[9px] uppercase tracking-[0.14em] text-ink/60">
                        Prediction
                      </span>
                    </div>
                  </div>

                  <div className="panel-bevel rounded-sm p-4 text-center">
                    <p className="font-blackletter text-base text-primary text-glow m-0">
                      AI Predicted Winner: {matchPrediction.prediction.predicted_winner}
                    </p>
                    <p
                      className={`font-pixel text-[10px] uppercase tracking-[0.16em] mt-2 m-0 ${
                        matchPrediction.prediction.predicted_winner === "Blue Team"
                          ? "text-success"
                          : "text-danger"
                      }`}
                    >
                      {matchPrediction.prediction.predicted_winner === "Blue Team"
                        ? "✅ Prediction was CORRECT!"
                        : "❌ Prediction was WRONG — Blue Team actually won"}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { label: "Winning Team Analysis", team: matchPrediction.team_analysis.blue_team, accent: "text-success" },
                      { label: "Losing Team Analysis", team: matchPrediction.team_analysis.red_team, accent: "text-danger" },
                    ].map(({ label, team, accent }) => (
                      <div key={label} className="panel-bevel rounded-sm p-4 space-y-3">
                        <h5 className={`font-pixel text-[10px] uppercase tracking-[0.16em] ${accent}`}>
                          ▸ {label}
                        </h5>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            ["Attack", team.composition_score.attack],
                            ["Defense", team.composition_score.defense],
                            ["Magic", team.composition_score.magic],
                            ["Synergy", team.composition_score.synergy],
                          ].map(([k, v]) => (
                            <div
                              key={k as string}
                              className="flex items-center justify-between px-2 py-1 rounded-sm bg-surface-inset/40 border border-border/40"
                            >
                              <span className="font-pixel text-[9px] uppercase tracking-[0.14em] text-ink/65">
                                {k}
                              </span>
                              <span className="font-display text-xs text-ink">{v}</span>
                            </div>
                          ))}
                        </div>
                        {team.strengths.length > 0 && (
                          <div>
                            <h6 className="font-pixel text-[9px] uppercase tracking-[0.16em] text-success mb-1">
                              Strengths
                            </h6>
                            <ul className="space-y-1 m-0 pl-0 list-none">
                              {team.strengths.map((s: string, i: number) => (
                                <li key={i} className="font-display text-xs text-ink/80 leading-snug">
                                  ◆ {s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {team.weaknesses.length > 0 && (
                          <div>
                            <h6 className="font-pixel text-[9px] uppercase tracking-[0.16em] text-danger mb-1">
                              Weaknesses
                            </h6>
                            <ul className="space-y-1 m-0 pl-0 list-none">
                              {team.weaknesses.map((w: string, i: number) => (
                                <li key={i} className="font-display text-xs text-ink/80 leading-snug">
                                  ◆ {w}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <p className="font-display text-[11px] italic text-ink/55 m-0 pt-2 border-t border-border/40">
                    {matchPrediction.disclaimer}
                  </p>
                </section>
              )}

              {loadingStates.timeline && (
                <div className="panel-bevel rounded-sm p-6 flex flex-col items-center gap-3">
                  <div className="loading-spinner" />
                  <p className="font-pixel text-[10px] uppercase tracking-widest text-ink/70 m-0">
                    Loading match timeline...
                  </p>
                </div>
              )}

              {matchTimeline && (
                <section className="panel-bevel rounded-sm p-5 space-y-4">
                  <div className="pb-2 border-b border-primary/25">
                    <h4 className="font-blackletter text-lg text-primary text-glow m-0">◆ Match Timeline</h4>
                    <p className="font-pixel text-[10px] uppercase tracking-[0.14em] text-ink/65 mt-2 m-0">
                      {matchTimeline.summary.total_frames} frames · {matchTimeline.summary.total_kills} kills ·{" "}
                      {matchTimeline.summary.total_item_events} items · {matchTimeline.summary.total_ward_events} wards ·{" "}
                      {matchTimeline.summary.total_objective_events} objectives
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    {[
                      ["Game Duration", formatDuration(matchTimeline.game_duration / 1000)],
                      ["Total Frames", matchTimeline.summary.total_frames],
                      ["Total Kills", matchTimeline.summary.total_kills],
                      ["Item Events", matchTimeline.summary.total_item_events],
                      ["Ward Events", matchTimeline.summary.total_ward_events],
                      ["Objectives", matchTimeline.summary.total_objective_events],
                    ].map(([label, value]) => (
                      <div
                        key={label as string}
                        className="panel-bevel rounded-sm p-3 flex flex-col items-center gap-1"
                      >
                        <span className="font-pixel text-[9px] uppercase tracking-[0.14em] text-ink/65 text-center">
                          {label}
                        </span>
                        <span className="font-blackletter text-lg text-primary text-glow">{value}</span>
                      </div>
                    ))}
                  </div>

                  <div>
                    <h5 className="font-pixel text-[10px] uppercase tracking-[0.16em] text-primary mb-2">
                      ▸ Key Events by Minute
                    </h5>
                    <div className="border border-border/60 rounded-sm divide-y divide-border/40 max-h-96 overflow-y-auto">
                      {matchTimeline.frames.map((frame, index) => (
                        <div
                          key={index}
                          className={`flex items-center gap-3 px-3 py-2 ${
                            index % 2 === 0 ? "bg-surface-inset/30" : ""
                          }`}
                        >
                          <span className="font-pixel text-[10px] text-gold w-12 shrink-0">
                            {frame.minute}:00
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {frame.events.kills.length > 0 && (
                              <span className="px-2 py-0.5 rounded-sm border border-danger/40 bg-danger/10 text-danger font-pixel text-[9px] uppercase tracking-[0.12em]">
                                Kills: {frame.events.kills.length}
                              </span>
                            )}
                            {frame.events.objective_events.length > 0 && (
                              <span className="px-2 py-0.5 rounded-sm border border-gold/40 bg-gold/10 text-gold font-pixel text-[9px] uppercase tracking-[0.12em]">
                                Objectives: {frame.events.objective_events.length}
                              </span>
                            )}
                            {frame.events.item_events.length > 0 && (
                              <span className="px-2 py-0.5 rounded-sm border border-primary/40 bg-primary/10 text-primary font-pixel text-[9px] uppercase tracking-[0.12em]">
                                Items: {frame.events.item_events.length}
                              </span>
                            )}
                            {frame.events.ward_events && frame.events.ward_events.length > 0 && (
                              <span className="px-2 py-0.5 rounded-sm border border-success/40 bg-success/10 text-success font-pixel text-[9px] uppercase tracking-[0.12em]">
                                Wards: {frame.events.ward_events.length}
                              </span>
                            )}
                            {frame.events.kills.length === 0 &&
                              frame.events.objective_events.length === 0 &&
                              frame.events.item_events.length === 0 &&
                              (!frame.events.ward_events || frame.events.ward_events.length === 0) && (
                                <span className="font-pixel text-[9px] uppercase tracking-[0.12em] text-ink/45">
                                  No major events
                                </span>
                              )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
