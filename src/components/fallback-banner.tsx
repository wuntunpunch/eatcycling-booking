'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { isAuthCacheValid } from '@/lib/auth-cache';

export function FallbackBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    async function checkAuthMode() {
      try {
        const supabase = createClient();
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        // If Supabase auth fails but cache is valid, we're in fallback mode
        if ((!user || error) && isAuthCacheValid()) {
          setShowBanner(true);
        } else {
          setShowBanner(false);
        }
      } catch (error) {
        // If check fails but cache is valid, show banner
        if (isAuthCacheValid()) {
          setShowBanner(true);
        }
      }
    }

    checkAuthMode();
  }, []);

  if (!showBanner) return null;

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
      <div className="mx-auto max-w-7xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg
            className="h-5 w-5 text-yellow-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="text-yellow-800 text-sm font-medium">
            Using cached authentication - Supabase unavailable
          </p>
        </div>
      </div>
    </div>
  );
}
