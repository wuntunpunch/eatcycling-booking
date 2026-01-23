'use client';

import { useEffect } from 'react';
import { setAuthCache, getAuthCache } from '@/lib/auth-cache';

/**
 * Component to sync auth cache between cookies (for middleware) and localStorage (for client)
 * Should be included in the root layout or admin pages
 */
export function CacheSync() {
  useEffect(() => {
    // Sync cookie cache to localStorage if available
    const cookieCache = document.cookie
      .split('; ')
      .find(row => row.startsWith('eatcycling_auth_cache='))
      ?.split('=')[1];

    if (cookieCache) {
      try {
        const cache = JSON.parse(decodeURIComponent(cookieCache));
        const existingCache = getAuthCache();
        
        // Update localStorage if cookie is newer or doesn't exist locally
        if (!existingCache || cache.timestamp > existingCache.timestamp) {
          setAuthCache(cache.email);
        }
      } catch (error) {
        console.error('Failed to sync cache from cookie:', error);
      }
    }

    // Sync localStorage cache to cookie for middleware
    const localCache = getAuthCache();
    if (localCache) {
      document.cookie = `eatcycling_auth_cache=${JSON.stringify(localCache)}; path=/; max-age=${24 * 60 * 60}`;
    }
  }, []);

  return null;
}
