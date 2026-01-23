'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Customer } from '@/lib/types';
import { AdminHeader } from '@/components/admin-header';
import { CacheSync } from '@/components/cache-sync';
import { FallbackBanner } from '@/components/fallback-banner';
import { fetchWithRetry } from '@/lib/api-client';

export default function CustomersPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetchWithRetry(
        `/api/admin/customers?q=${encodeURIComponent(searchQuery)}`,
        {},
        1
      );

      if (response.status === 401) {
        alert('Session expired, please log in again');
        router.push('/admin/login');
        return;
      }

      if (!response.ok) {
        const error = await response.json();
        console.error('Search error:', error);
        return;
      }

      const { customers } = await response.json();
      setCustomers(customers || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <CacheSync />
      <FallbackBanner />
      <AdminHeader title="Customers" backLink="/admin" backLabel="Back to Dashboard" />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or phone..."
              className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {customers.length > 0 ? (
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {customer.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {customer.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {customer.email || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(customer.created_at).toLocaleDateString('en-GB')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg bg-white p-8 text-center text-gray-500">
            Search for customers by name or phone number
          </div>
        )}
      </main>
    </div>
  );
}
