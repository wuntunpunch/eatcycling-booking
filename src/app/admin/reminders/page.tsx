'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SERVICE_LABELS, ServiceType } from '@/lib/types';
import { AdminHeader } from '@/components/admin-header';
import { CacheSync } from '@/components/cache-sync';
import { FallbackBanner } from '@/components/fallback-banner';
import { useToast } from '@/components/toast';
import { fetchWithRetry } from '@/lib/api-client';

type Reminder = {
  customer: {
    id: string;
    name: string;
    phone: string;
  };
  serviceTypes: ServiceType[];
  completedAt: string;
  bookingIds: string[];
  daysSince?: number;
  reminder_sent_at?: string;
  error_message?: string;
  failureCount?: number;
};

type Stats = {
  totalSent: number;
  successful: number;
  failed: number;
  successRate: number;
  estimatedCost: number;
};

export default function RemindersPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'due' | 'sent' | 'failed' | 'stats'>('due');
  const [dueReminders, setDueReminders] = useState<Reminder[]>([]);
  const [sentReminders, setSentReminders] = useState<Reminder[]>([]);
  const [failedReminders, setFailedReminders] = useState<Reminder[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<Set<string>>(new Set());
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  async function fetchData() {
    setLoading(true);
    try {
      if (activeTab === 'stats') {
        const response = await fetchWithRetry(`/api/admin/reminders?type=stats`, {}, 1);
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } else {
        const response = await fetchWithRetry(`/api/admin/reminders?type=${activeTab}`, {}, 1);
        
        if (response.status === 401) {
          showToast('Session expired, please log in again', 'error');
          router.push('/admin/login');
          return;
        }

        if (response.ok) {
          const data = await response.json();
          if (activeTab === 'due') {
            setDueReminders(data.reminders || []);
          } else if (activeTab === 'sent') {
            setSentReminders(data.reminders || []);
          } else if (activeTab === 'failed') {
            setFailedReminders(data.reminders || []);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching reminders:', error);
      showToast('Failed to fetch reminders', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSendReminder(bookingIds: string[]) {
    if (bookingIds.length === 0) return;
    
    const bookingId = bookingIds[0];
    setProcessing((prev) => new Set(prev).add(bookingId));
    
    try {
      const response = await fetch('/api/admin/reminders/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      });

      if (response.ok) {
        const data = await response.json();
        showToast(data.message || 'Reminder sent successfully', 'success');
        await fetchData();
      } else {
        const error = await response.json();
        showToast(`Failed to send reminder: ${error.message}`, 'error');
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
      showToast('Failed to send reminder', 'error');
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev);
        bookingIds.forEach(id => next.delete(id));
        return next;
      });
    }
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  function formatServices(serviceTypes: ServiceType[]): string {
    return serviceTypes.map(st => SERVICE_LABELS[st]).join(', ');
  }

  return (
    <div className="min-h-screen">
      <CacheSync />
      <FallbackBanner />
      <AdminHeader title="Reminders" backLink="/admin" backLabel="Back to Dashboard" />
      {ToastComponent}

      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {(['due', 'sent', 'failed', 'stats'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm
                  ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab === 'due' && 'Due Reminders'}
                {tab === 'sent' && 'Sent History'}
                {tab === 'failed' && 'Failed'}
                {tab === 'stats' && 'Statistics'}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        ) : (
          <>
            {activeTab === 'due' && (
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Due Reminders ({dueReminders.length})
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Customers due for 6-month service reminders
                  </p>
                </div>
                {dueReminders.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No reminders due at this time
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Customer
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Last Service
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Service Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Days Since
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {dueReminders.map((reminder, idx) => {
                          const isProcessing = reminder.bookingIds.some(id => processing.has(id));
                          return (
                            <tr key={idx}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {reminder.customer.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {reminder.customer.phone}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatDate(reminder.completedAt)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatServices(reminder.serviceTypes)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {reminder.daysSince || Math.floor((new Date().getTime() - new Date(reminder.completedAt).getTime()) / (1000 * 60 * 60 * 24))} days
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <button
                                  onClick={() => handleSendReminder(reminder.bookingIds)}
                                  disabled={isProcessing}
                                  className="text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isProcessing ? 'Sending...' : 'Send Reminder'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'sent' && (
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Sent History ({sentReminders.length})
                  </h2>
                </div>
                {sentReminders.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No reminders sent yet
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Customer
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Service Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Completed Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Sent Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {sentReminders.map((reminder: Reminder & { service_type?: ServiceType; completed_at?: string; reminder_sent_at?: string }, idx: number) => (
                          <tr key={idx}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {reminder.customer?.name || 'Unknown'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {reminder.customer?.phone || ''}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {reminder.service_type 
                                ? SERVICE_LABELS[reminder.service_type]
                                : formatServices(reminder.serviceTypes)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(reminder.completed_at || reminder.completedAt)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {reminder.reminder_sent_at ? formatDate(reminder.reminder_sent_at) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'failed' && (
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Failed Reminders ({failedReminders.length})
                  </h2>
                </div>
                {failedReminders.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No failed reminders
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Customer
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Error
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Failure Count
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Last Attempt
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {failedReminders.map((reminder: Reminder & { recipient_phone?: string; created_at?: string }, idx: number) => (
                          <tr key={idx}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {reminder.customer?.name || 'Unknown'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {reminder.recipient_phone || reminder.customer?.phone || ''}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              <div className="max-w-md truncate" title={reminder.error_message}>
                                {reminder.error_message || 'Unknown error'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {reminder.failureCount || 1}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {reminder.created_at ? formatDate(reminder.created_at) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'stats' && stats && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-sm font-medium text-gray-500">Total Sent (This Month)</h3>
                  <p className="mt-2 text-3xl font-semibold text-gray-900">{stats.totalSent}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-sm font-medium text-gray-500">Successful</h3>
                  <p className="mt-2 text-3xl font-semibold text-green-600">{stats.successful}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-sm font-medium text-gray-500">Failed</h3>
                  <p className="mt-2 text-3xl font-semibold text-red-600">{stats.failed}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-sm font-medium text-gray-500">Success Rate</h3>
                  <p className="mt-2 text-3xl font-semibold text-gray-900">{stats.successRate}%</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow md:col-span-2">
                  <h3 className="text-sm font-medium text-gray-500">Estimated Cost (This Month)</h3>
                  <p className="mt-2 text-3xl font-semibold text-gray-900">£{stats.estimatedCost.toFixed(2)}</p>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
