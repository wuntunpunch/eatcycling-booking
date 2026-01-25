'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { clearAuthCache, getCachedEmail } from '@/lib/auth-cache';

interface AdminHeaderProps {
  title: string;
  backLink?: string;
  backLabel?: string;
}

export function AdminHeader({ title, backLink, backLabel }: AdminHeaderProps) {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // Try to get name from user metadata, fallback to email
          const name = user.user_metadata?.name || user.user_metadata?.full_name;
          setUserEmail(name || user.email || null);
        } else {
          // Check fallback cache
          const cachedEmail = getCachedEmail();
          setUserEmail(cachedEmail);
        }
      } catch (error) {
        console.error('Error loading user:', error);
        // Check fallback cache
        const cachedEmail = getCachedEmail();
        setUserEmail(cachedEmail);
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Clear cache first
      clearAuthCache();
      document.cookie = 'eatcycling_auth_cache=; max-age=0; path=/';

      // Try Supabase logout
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch (error) {
        console.error('Supabase logout error:', error);
        // Continue anyway - cache is cleared
      }

      router.push('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/admin/login');
    }
  };

  return (
    <header className="bg-white shadow">
      <div className="mx-auto max-w-7xl px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {backLink && (
            <Link href={backLink} className="text-blue-600 hover:text-blue-800 text-sm">
              {backLabel || 'Back'}
            </Link>
          )}
        </div>
        <div className="flex items-center gap-4">
          {!isLoading && userEmail && (
            <span className="text-sm text-gray-600 hidden sm:inline">
              {userEmail}
            </span>
          )}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      </div>
    </header>
  );
}
