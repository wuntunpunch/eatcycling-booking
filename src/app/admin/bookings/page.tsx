'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SERVICE_LABELS, BookingWithCustomer } from '@/lib/types';
import { AdminHeader } from '@/components/admin-header';
import { CacheSync } from '@/components/cache-sync';
import { FallbackBanner } from '@/components/fallback-banner';
import { fetchWithRetry } from '@/lib/api-client';

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<BookingWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingReady, setMarkingReady] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  async function fetchBookings() {
    try {
      const response = await fetchWithRetry('/api/admin/bookings', {}, 1);
      
      if (response.status === 401) {
        // Show error message before redirect
        alert('Session expired, please log in again');
        router.push('/admin/login');
        return;
      }

      if (!response.ok) {
        const error = await response.json();
        console.error('Error fetching bookings:', error);
        return;
      }

      const { bookings } = await response.json();
      setBookings((bookings || []) as unknown as BookingWithCustomer[]);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkReady(bookingId: string) {
    setMarkingReady(bookingId);
    try {
      const response = await fetch(`/api/bookings/${bookingId}/ready`, {
        method: 'POST',
      });

      if (response.ok) {
        // Refresh bookings
        await fetchBookings();
      } else {
        const error = await response.json();
        alert(`Failed to mark ready: ${error.message}`);
      }
    } catch (error) {
      console.error('Error marking ready:', error);
      alert('Failed to mark ready');
    } finally {
      setMarkingReady(null);
    }
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-purple-100 text-purple-800',
    ready: 'bg-green-100 text-green-800',
    collected: 'bg-gray-100 text-gray-800',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <CacheSync />
        <FallbackBanner />
        <AdminHeader title="Bookings" backLink="/admin" backLabel="Back to Dashboard" />
        <main className="mx-auto max-w-7xl px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <CacheSync />
      <FallbackBanner />
      <AdminHeader title="Bookings" backLink="/admin" backLabel="Back to Dashboard" />

      <main className="mx-auto max-w-7xl px-4 py-8">
        {bookings.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center text-gray-500">
            No bookings yet
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(booking.date).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {booking.customer.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {booking.customer.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {SERVICE_LABELS[booking.service_type]}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${statusColors[booking.status]}`}
                      >
                        {booking.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {booking.status !== 'ready' && booking.status !== 'collected' && (
                        <button
                          onClick={() => handleMarkReady(booking.id)}
                          disabled={markingReady === booking.id}
                          className="text-green-600 hover:text-green-800 disabled:opacity-50"
                        >
                          {markingReady === booking.id ? 'Sending...' : 'Mark Ready'}
                        </button>
                      )}
                      {booking.status === 'ready' && (
                        <span className="text-green-600">Ready for collection</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
