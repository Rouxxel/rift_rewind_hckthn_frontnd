// Shared champion cache service to prevent multiple simultaneous requests
import { apiService } from './api';
import { cache, CACHE_KEYS } from '../utils/cache';

// Global state to track loading
let isLoading = false;
let loadPromise: Promise<Record<string, any>> | null = null;
let championsData: Record<string, any> | null = null;

/**
 * Get champions data with deduplication
 * Multiple calls will share the same request
 */
export const getChampions = async (): Promise<Record<string, any>> => {
  // If we already have data, return it immediately
  if (championsData) {
    console.log('📋 Using in-memory champions data');
    return championsData;
  }

  // Check persistent cache
  const cachedChampions = cache.get<Record<string, any>>(CACHE_KEYS.CHAMPIONS);
  if (cachedChampions) {
    console.log('📋 Using cached champions data');
    championsData = cachedChampions;
    return cachedChampions;
  }

  // If already loading, wait for the existing request
  if (isLoading && loadPromise) {
    console.log('⏳ Champions already loading, waiting for existing request...');
    return loadPromise;
  }

  // Start new load
  console.log('🔄 Loading champions from API...');
  isLoading = true;
  
  loadPromise = (async () => {
    try {
      const response = await apiService.getChampions();
      console.log('✅ Champions loaded:', response);

      const data = response.champions || {};
      championsData = data;

      // Cache for 60 minutes
      cache.set(CACHE_KEYS.CHAMPIONS, data, 60);

      return data;
    } catch (err: any) {
      console.error('❌ Failed to load champions:', err);
      
      // If it's a rate limit error, wait and retry once
      if (err.message?.includes('rate limit')) {
        console.log('⏳ Rate limited, waiting 3 seconds before retry...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        try {
          console.log('🔄 Retrying champion load...');
          const response = await apiService.getChampions();
          const data = response.champions || {};
          championsData = data;
          cache.set(CACHE_KEYS.CHAMPIONS, data, 60);
          console.log('✅ Champions loaded on retry');
          return data;
        } catch (retryErr: any) {
          console.error('❌ Retry failed:', retryErr);
          throw retryErr;
        }
      }
      
      throw err;
    } finally {
      isLoading = false;
      loadPromise = null;
    }
  })();

  return loadPromise;
};

/**
 * Clear the in-memory cache (useful for testing or forcing refresh)
 */
export const clearChampionsCache = () => {
  console.log('🧹 Clearing champions cache');
  championsData = null;
  isLoading = false;
  loadPromise = null;
  cache.remove(CACHE_KEYS.CHAMPIONS);
};

/**
 * Check if champions are loaded
 */
export const areChampionsLoaded = (): boolean => {
  return championsData !== null || cache.get(CACHE_KEYS.CHAMPIONS) !== null;
};
