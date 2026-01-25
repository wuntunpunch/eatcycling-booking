import { createServerSupabaseClient } from './supabase-server';
import { NextRequest } from 'next/server';

export interface AuthResult {
  authenticated: boolean;
  email: string | null;
  userId: string | null;
  isFallback: boolean;
}

/**
 * Check authentication for API routes
 * Tries Supabase first, falls back to localStorage cache if Supabase fails
 * Also supports password-based authentication (sets same cache format)
 */
export async function checkAuth(request: NextRequest): Promise<AuthResult> {
  // Try Supabase authentication first
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (user && !authError && user.email) {
      return {
        authenticated: true,
        email: user.email,
        userId: user.id,
        isFallback: false,
      };
    }
  } catch (error) {
    console.log('Supabase auth check failed, trying fallback:', error);
  }

  // Supabase failed - check for fallback cache
  const cacheCookie = request.cookies.get('eatcycling_auth_cache');
  
  if (cacheCookie) {
    try {
      const cache = JSON.parse(cacheCookie.value);
      const age = Date.now() - cache.timestamp;
      const isValid = age < 24 * 60 * 60 * 1000; // 24 hours

      if (isValid && cache.email) {
        return {
          authenticated: true,
          email: cache.email,
          userId: null, // No user ID in fallback
          isFallback: true,
        };
      }
    } catch (error) {
      console.error('Failed to parse cache cookie:', error);
    }
  }

  return {
    authenticated: false,
    email: null,
    userId: null,
    isFallback: false,
  };
}
