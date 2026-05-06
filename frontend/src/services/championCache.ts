// Shared champion cache service to prevent multiple simultaneous requests
import { apiService } from './api';
import { cache, CACHE_KEYS } from '../utils/cache';

// Global state to track loading
let isLoading = false;
let loadPromise: Promise<Record<string, any>> | null = null;
let championsData: Record<string, any> | null = null;
let lastAttemptTime = 0;
let failureCount = 0;

const MIN_RETRY_INTERVAL = 10000; // 10 seconds minimum between attempts
const MAX_FAILURES = 2; // Stop trying after 2 failures

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

  // Check if we've failed too many times recently
  if (failureCount >= MAX_FAILURES) {
    const timeSinceLastAttempt = Date.now() - lastAttemptTime;
    if (timeSinceLastAttempt < MIN_RETRY_INTERVAL * 3) {
      console.warn(`⚠️ Too many failures (${failureCount}), please wait ${Math.ceil((MIN_RETRY_INTERVAL * 3 - timeSinceLastAttempt) / 1000)}s before retrying`);
      throw new Error('Too many failed attempts. Please wait 30 seconds and try again.');
    } else {
      // Reset after waiting long enough
      console.log('🔄 Resetting failure count after cooldown period');
      failureCount = 0;
    }
  }

  // Enforce minimum retry interval to prevent rate limiting
  const timeSinceLastAttempt = Date.now() - lastAttemptTime;
  if (timeSinceLastAttempt < MIN_RETRY_INTERVAL && lastAttemptTime > 0) {
    const waitTime = MIN_RETRY_INTERVAL - timeSinceLastAttempt;
    console.log(`⏳ Rate limit protection: waiting ${Math.ceil(waitTime / 1000)}s before next attempt`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  // Start new load
  console.log('🔄 Loading champions from API...');
  isLoading = true;
  lastAttemptTime = Date.now();
  
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
      failureCount++;
      console.error(`❌ Failed to load champions (failure ${failureCount}/${MAX_FAILURES}):`, err);
      
      // Don't retry on CORS errors if we've already failed - backend is likely down
      if (err.message?.includes('CORS') && failureCount >= MAX_FAILURES) {
        console.error('❌ Backend appears to be unavailable');
        throw new Error('Unable to connect to backend. Please check if the backend is running.');
      }
      
      // Retry on rate limit or connection errors (backend might be waking up)
      const shouldRetry = failureCount < MAX_FAILURES && (
        err.message?.includes('rate limit') || 
        err.message?.includes('CORS') ||
        err.message?.includes('Unable to connect')
      );
      
      if (shouldRetry) {
        const waitTime = err.message?.includes('rate limit') ? 5000 : 10000;
        console.log(`⏳ Connection issue detected, waiting ${waitTime/1000} seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        try {
          console.log('🔄 Retrying champion load...');
          lastAttemptTime = Date.now();
          const response = await apiService.getChampions();
          const data = response.champions || {};
          championsData = data;
          failureCount = 0; // Reset on success
          cache.set(CACHE_KEYS.CHAMPIONS, data, 60);
          console.log('✅ Champions loaded on retry');
          return data;
        } catch (retryErr: any) {
          failureCount++;
          console.error(`❌ Retry failed (failure ${failureCount}/${MAX_FAILURES}):`, retryErr);
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
  lastAttemptTime = 0;
  failureCount = 0;
  cache.remove(CACHE_KEYS.CHAMPIONS);
};

/**
 * Check if champions are loaded
 */
export const areChampionsLoaded = (): boolean => {
  return championsData !== null || cache.get(CACHE_KEYS.CHAMPIONS) !== null;
};
