'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminHeader } from '@/components/admin-header';
import { CacheSync } from '@/components/cache-sync';
import { FallbackBanner } from '@/components/fallback-banner';
import { createClient } from '@/lib/supabase';
import { isAuthCacheValid, getCachedEmail } from '@/lib/auth-cache';

export default function AdminDashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient();
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (user && !error) {
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        }

        // Check fallback cache
        if (isAuthCacheValid() && getCachedEmail()) {
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        }

        // Not authenticated
        router.push('/admin/login');
      } catch (error) {
        console.error('Auth check error:', error);
        // Check fallback cache
        if (isAuthCacheValid() && getCachedEmail()) {
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        }
        router.push('/admin/login');
      }
    }

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <CacheSync />
        <FallbackBanner />
        <AdminHeader title="EAT Cycling Admin" />
        <main className="mx-auto max-w-7xl px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="h-32 bg-gray-200 rounded-lg"></div>
              <div className="h-32 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen">
      <CacheSync />
      <FallbackBanner />
      <AdminHeader title="EAT Cycling Admin" />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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

          <Link
            href="/admin/reminders"
            className="block rounded-lg bg-white p-6 shadow hover:shadow-md transition-shadow"
          >
            <h2 className="text-xl font-semibold text-gray-900">Reminders</h2>
            <p className="mt-2 text-gray-600">Manage 6-month service reminders</p>
          </Link>

          <Link
            href="/admin/availability"
            className="block rounded-lg bg-white p-6 shadow hover:shadow-md transition-shadow"
          >
            <h2 className="text-xl font-semibold text-gray-900">Availability</h2>
            <p className="mt-2 text-gray-600">Manage available booking dates</p>
          </Link>

          <Link
            href="/admin/service-limits"
            className="block rounded-lg bg-white p-6 shadow hover:shadow-md transition-shadow"
          >
            <h2 className="text-xl font-semibold text-gray-900">Service Limits</h2>
            <p className="mt-2 text-gray-600">Control maximum services per day</p>
          </Link>
        </div>
      </main>
    </div>
  );
}
