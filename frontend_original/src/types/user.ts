// User-related types
export interface RiotUser {
  puuid: string;
  gameName: string;
  tagLine: string;
}

export interface UserCredentials {
  gameName: string;
  tagLine: string;
  region: string;
}

export interface SummonerInfo {
  id: string;
  accountId: string;
  puuid: string;
  name: string;
  profileIconId: number;
  revisionDate: number;
  summonerLevel: number;
}

export interface RankedStats {
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
}