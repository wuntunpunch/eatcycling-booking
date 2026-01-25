/**
 * Utility for localStorage-based authentication caching
 * Used as fallback when Supabase/auth is temporarily unavailable
 */

const CACHE_KEY = 'eatcycling_auth_cache';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

interface AuthCache {
  email: string;
  timestamp: number;
}

export function setAuthCache(email: string): void {
  if (typeof window === 'undefined') return;
  
  const cache: AuthCache = {
    email,
    timestamp: Date.now(),
  };
  
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Failed to set auth cache:', error);
  }
}

export function getAuthCache(): AuthCache | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    return JSON.parse(cached) as AuthCache;
  } catch (error) {
    console.error('Failed to get auth cache:', error);
    return null;
  }
}

export function isAuthCacheValid(): boolean {
  const cache = getAuthCache();
  if (!cache) return false;
  
  const age = Date.now() - cache.timestamp;
  return age < CACHE_DURATION_MS;
}

export function clearAuthCache(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.error('Failed to clear auth cache:', error);
  }
}

export function getCachedEmail(): string | null {
  const cache = getAuthCache();
  return cache?.email || null;
}
