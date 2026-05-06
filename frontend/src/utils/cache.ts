// Cache utility for persistent data storage
interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresIn: number; // milliseconds
}

class CacheManager {
  private prefix = 'rift_rewind_cache_';

  // Set cache with expiration
  set<T>(key: string, data: T, expiresInMinutes: number = 30): void {
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      expiresIn: expiresInMinutes * 60 * 1000 // convert to milliseconds
    };

    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(cacheItem));
      console.log(`📦 Cached data for key: ${key}`);
    } catch (error) {
      console.warn('Failed to cache data:', error);
    }
  }

  // Get cache if not expired
  get<T>(key: string): T | null {
    try {
      const cached = localStorage.getItem(this.prefix + key);
      if (!cached) return null;

      const cacheItem: CacheItem<T> = JSON.parse(cached);
      const now = Date.now();

      // Check if expired
      if (now - cacheItem.timestamp > cacheItem.expiresIn) {
        console.log(`⏰ Cache expired for key: ${key}`);
        this.remove(key);
        return null;
      }

      console.log(`📋 Using cached data for key: ${key}`);
      return cacheItem.data;
    } catch (error) {
      console.warn('Failed to get cached data:', error);
      return null;
    }
  }

  // Remove specific cache
  remove(key: string): void {
    try {
      localStorage.removeItem(this.prefix + key);
      console.log(`🗑️ Removed cache for key: ${key}`);
    } catch (error) {
      console.warn('Failed to remove cache:', error);
    }
  }

  // Clear all cache
  clear(): void {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith(this.prefix));
      keys.forEach(key => localStorage.removeItem(key));
      console.log(`🧹 Cleared all cache (${keys.length} items)`);
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }

  // Get cache info
  getInfo(): { key: string; size: number; age: number }[] {
    const info: { key: string; size: number; age: number }[] = [];
    
    try {
      Object.keys(localStorage).forEach(fullKey => {
        if (fullKey.startsWith(this.prefix)) {
          const key = fullKey.replace(this.prefix, '');
          const value = localStorage.getItem(fullKey);
          if (value) {
            const cacheItem = JSON.parse(value);
            info.push({
              key,
              size: new Blob([value]).size,
              age: Date.now() - cacheItem.timestamp
            });
          }
        }
      });
    } catch (error) {
      console.warn('Failed to get cache info:', error);
    }

    return info;
  }
}

// Export singleton instance
export const cache = new CacheManager();

// Cache keys constants
export const CACHE_KEYS = {
  CHAMPIONS: 'champions',
  ITEMS: 'items',
  WINRATES_ALL: 'winrates_all_data', // Single cache for all winrates data
  WINRATES: (rank: string, sortBy: string) => `winrates_${rank}_${sortBy}`, // Legacy, kept for compatibility
  CHAMPION_ABILITIES: (championName: string) => `abilities_${championName}`,
  // Match History cache keys
  MATCH_HISTORY: (puuid: string) => `match_history_${puuid}`,
  MATCH_DETAILS: (matchId: string) => `match_details_${matchId}`,
  MATCH_PARTICIPANTS: (matchId: string) => `match_participants_${matchId}`,
  MATCH_TIMELINE: (matchId: string) => `match_timeline_${matchId}`,
  TEAM_COMPOSITION: (champions: string[]) => `team_comp_${champions.sort().join('_')}`,
  // Performance Analysis cache keys
  PLAYER_PERFORMANCE: (puuid: string) => `player_performance_${puuid}`,
  CHAMPION_MASTERY: (puuid: string) => `champion_mastery_${puuid}`,
  SUMMONER_SPELLS: (puuid: string) => `summoner_spells_${puuid}`,
  RUNE_MASTERIES: (puuid: string) => `rune_masteries_${puuid}`,
} as const;