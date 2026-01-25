'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CacheSync } from '@/components/cache-sync';
import { getAuthCache, isAuthCacheValid, getCachedEmail } from '@/lib/auth-cache';

export default function FallbackPage() {
  const router = useRouter();
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const cache = getAuthCache();
    const valid = isAuthCacheValid();
    const cachedEmail = getCachedEmail();

    if (!valid || !cachedEmail) {
      router.push('/admin/login');
      return;
    }

    setIsValid(true);
    setEmail(cachedEmail);

    // Set cookie for middleware to read
    document.cookie = `eatcycling_auth_cache=${JSON.stringify(cache)}; path=/; max-age=${24 * 60 * 60}`;
  }, [router]);

  if (isValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Checking authentication...</p>
      </div>
    );
  }

  if (!isValid) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen">
      <CacheSync />
      {/* Warning Banner */}
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

      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">EAT Cycling Admin</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Logged in as: {email}</span>
            <Link
              href="/admin/login"
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Switch Account
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2">
          <Link
            href="/admin/bookings"
            className="block rounded-lg bg-white p-6 shadow hover:shadow-md transition-shadow"
          >
            <h2 className="text-xl font-semibold text-gray-900">Bookings</h2>
            <p className="mt-2 text-gray-600">View and manage all bookings</p>
          </Link>

          <Link
            href="/admin/customers"
            className="block rounded-lg bg-white p-6 shadow hover:shadow-md transition-shadow"
          >
            <h2 className="text-xl font-semibold text-gray-900">Customers</h2>
            <p className="mt-2 text-gray-600">Search and view customer history</p>
          </Link>
        </div>
      </main>
    </div>
  );
}
