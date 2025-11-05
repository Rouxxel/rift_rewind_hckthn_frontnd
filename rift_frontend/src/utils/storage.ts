// Browser storage utilities for user data
import type { UserCredentials, RiotUser } from '../types/user';

const STORAGE_KEYS = {
  USER_CREDENTIALS: 'rift_rewind_user_credentials',
  USER_PUUID: 'rift_rewind_user_puuid',
  USER_DATA: 'rift_rewind_user_data'
} as const;

export const storage = {
  // Save user credentials to localStorage
  saveUserCredentials: (credentials: UserCredentials): void => {
    localStorage.setItem(STORAGE_KEYS.USER_CREDENTIALS, JSON.stringify(credentials));
  },

  // Get user credentials from localStorage
  getUserCredentials: (): UserCredentials | null => {
    const stored = localStorage.getItem(STORAGE_KEYS.USER_CREDENTIALS);
    return stored ? JSON.parse(stored) : null;
  },

  // Save user PUUID and basic info
  saveUserData: (userData: RiotUser): void => {
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
  },

  // Get user data
  getUserData: (): RiotUser | null => {
    const stored = localStorage.getItem(STORAGE_KEYS.USER_DATA);
    return stored ? JSON.parse(stored) : null;
  },

  // Clear all user data
  clearUserData: (): void => {
    localStorage.removeItem(STORAGE_KEYS.USER_CREDENTIALS);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
  },

  // Check if user is authenticated (has PUUID)
  isUserAuthenticated: (): boolean => {
    const userData = storage.getUserData();
    return userData !== null && userData.puuid !== undefined;
  }
};