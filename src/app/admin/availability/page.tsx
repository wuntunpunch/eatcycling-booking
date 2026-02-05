'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { AdminHeader } from '@/components/admin-header';
import { CacheSync } from '@/components/cache-sync';
import { FallbackBanner } from '@/components/fallback-banner';
import { useToast } from '@/components/toast';
import { fetchWithRetry } from '@/lib/api-client';
import { AvailabilitySettings, ExcludedDate, ExcludedDateRange } from '@/lib/types';
import { format } from 'date-fns';

export default function AvailabilityPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AvailabilitySettings | null>(null);
  const [excludedDates, setExcludedDates] = useState<(ExcludedDate & { warning?: { bookingCount: number } })[]>([]);
  const [showPastExclusions, setShowPastExclusions] = useState(false);
  const [hasError, setHasError] = useState(false);
  const hasFetchedRef = useRef(false);
  
  // Form state for adding excluded dates
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [reason, setReason] = useState('');
  const [isRangeMode, setIsRangeMode] = useState(false);
  
  const { showToast, ToastComponent } = useToast();
  const showToastRef = useRef(showToast);
  
  // Keep showToast ref updated
  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  const fetchData = useCallback(async () => {
    if (hasFetchedRef.current) {
      console.log('Skipping fetch - already fetching');
      return; // Prevent concurrent fetches
    }
    console.log('fetchData called, loading state:', loading);
    hasFetchedRef.current = true;
    setLoading(true);
    console.log('Starting fetch...');
    
    try {
      const url = `/api/admin/availability${showPastExclusions ? '' : '?future_only=true'}`;
      console.log('Fetching from:', url);
      
      const response = await fetchWithRetry(url, {}, 1);
      console.log('Response received, status:', response.status);

      if (response.status === 401) {
        showToastRef.current('Session expired, please log in again', 'error');
        router.push('/admin/login');
        setLoading(false);
        hasFetchedRef.current = false;
        return;
      }

      if (response.ok) {
        const data = await response.json();
        console.log('Availability data received:', data);
        console.log('Response status:', response.status);
        console.log('Data keys:', Object.keys(data));
        
        // Handle response - could be { settings, excludedDates } or just settings
        if (data.settings) {
          console.log('Setting settings:', data.settings);
          setSettings(data.settings);
          // If excluded dates are in the same response, use them
          if (data.excludedDates) {
            setExcludedDates(data.excludedDates || []);
          }
        } else {
          console.error('No settings in response:', data);
          showToastRef.current('Invalid response format. Check console for details.', 'error');
        }
        
        // Fetch excluded dates with warnings (if not already in response)
        if (!data.excludedDates) {
          const datesUrl = `/api/admin/availability/excluded-dates${showPastExclusions ? '' : '?future_only=true'}`;
          console.log('Fetching excluded dates from:', datesUrl);
          const datesResponse = await fetchWithRetry(datesUrl, {}, 1);
          if (datesResponse.ok) {
            const datesData = await datesResponse.json();
            console.log('Excluded dates received:', datesData);
            setExcludedDates(datesData.excludedDates || []);
          } else {
            console.error('Failed to fetch excluded dates:', datesResponse.status);
          }
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        if (errorData.message?.includes('table') || errorData.message?.includes('availability_settings') || errorData.error === 'TABLE_NOT_FOUND') {
          showToastRef.current('Database tables not found. Please run migration 006_add_availability_settings.sql', 'error');
          setHasError(true); // Stop retrying
        } else {
          showToastRef.current(errorData.message || 'Failed to fetch availability settings', 'error');
        }
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
      showToastRef.current('Failed to fetch availability settings', 'error');
    } finally {
      console.log('Fetch complete, setting loading to false');
      setLoading(false);
      hasFetchedRef.current = false;
    }
  }, [showPastExclusions, router]);

  // Debug: Log when settings change
  useEffect(() => {
    console.log('Settings state changed:', settings);
    console.log('Loading state:', loading);
    console.log('Has error:', hasError);
  }, [settings, loading, hasError]);

  // Fetch data on mount and when showPastExclusions changes
  useEffect(() => {
    console.log('useEffect triggered, hasError:', hasError, 'showPastExclusions:', showPastExclusions);
    hasFetchedRef.current = false; // Reset when showPastExclusions changes
    if (!hasError) {
      console.log('Calling fetchData...');
      fetchData();
    } else {
      console.log('Skipping fetchData due to error');
    }
    // Only depend on showPastExclusions and hasError, not fetchData
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPastExclusions, hasError]);

  async function handleSaveSettings() {
    if (!settings) return;
    
    setSaving(true);
    try {
      const response = await fetchWithRetry('/api/admin/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exclude_weekends: settings.exclude_weekends,
          exclude_sundays: settings.exclude_sundays,
        }),
      }, 1);

      if (response.status === 401) {
        showToast('Session expired, please log in again', 'error');
        router.push('/admin/login');
        return;
      }

      if (response.ok) {
        showToast('Settings saved successfully', 'success');
        fetchData();
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to save settings', 'error');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddExcludedDate() {
    if (!startDate) {
      showToast('Please select a start date', 'error');
      return;
    }

    if (isRangeMode && !endDate) {
      showToast('Please select an end date for the range', 'error');
      return;
    }

    if (isRangeMode && endDate && endDate < startDate) {
      showToast('End date must be after start date', 'error');
      return;
    }

    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = isRangeMode && endDate ? format(endDate, 'yyyy-MM-dd') : undefined;

    try {
      const body: ExcludedDateRange = {
        start_date: startDateStr,
        end_date: endDateStr,
        reason: reason.trim() || undefined,
      };

      const response = await fetchWithRetry('/api/admin/availability/excluded-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }, 1);

      if (response.status === 401) {
        showToast('Session expired, please log in again', 'error');
        router.push('/admin/login');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        showToast(
          data.excludedDate.warning
            ? `Date excluded (${data.excludedDate.warning.bookingCount} existing bookings)`
            : 'Date excluded successfully',
          data.excludedDate.warning ? 'info' : 'success'
        );
        setStartDate(null);
        setEndDate(null);
        setReason('');
        setIsRangeMode(false);
        fetchData();
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to add excluded date', 'error');
      }
    } catch (error) {
      console.error('Error adding excluded date:', error);
      showToast('Failed to add excluded date', 'error');
    }
  }

  async function handleDeleteExcludedDate(id: string) {
    if (!confirm('Are you sure you want to remove this excluded date?')) {
      return;
    }

    try {
      const response = await fetchWithRetry(
        `/api/admin/availability/excluded-dates?id=${id}`,
        { method: 'DELETE' },
        1
      );

      if (response.status === 401) {
        showToast('Session expired, please log in again', 'error');
        router.push('/admin/login');
        return;
      }

      if (response.ok) {
        showToast('Excluded date removed', 'success');
        fetchData();
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to remove excluded date', 'error');
      }
    } catch (error) {
      console.error('Error deleting excluded date:', error);
      showToast('Failed to remove excluded date', 'error');
    }
  }

  const today = new Date();
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 2);

  if (loading) {
    return (
      <div className="min-h-screen">
        <CacheSync />
        <FallbackBanner />
        <AdminHeader title="Availability Settings" backLink="/admin" backLabel="Dashboard" />
        <main className="mx-auto max-w-7xl px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-gray-200 rounded-lg"></div>
            <div className="h-64 bg-gray-200 rounded-lg"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <CacheSync />
      <FallbackBanner />
      <AdminHeader title="Availability Settings" backLink="/admin" backLabel="Dashboard" />
      <main className="mx-auto max-w-7xl px-4 py-8">
        {ToastComponent}
        
        {/* Section 1: Day Exclusions */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Day Exclusions</h2>
          
          {!settings ? (
            <div className="text-gray-500 text-sm">
              Loading settings... If this persists, check the browser console for errors.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Exclude weekends (Saturday + Sunday)
                  </label>
                  <p className="text-sm text-gray-500 mt-1">
                    Prevents bookings on both Saturday and Sunday
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.exclude_weekends}
                    onChange={(e) => {
                      const newSettings = {
                        ...settings,
                        exclude_weekends: e.target.checked,
                        exclude_sundays: e.target.checked ? false : settings.exclude_sundays,
                      };
                      setSettings(newSettings);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className={`text-sm font-medium ${settings.exclude_weekends ? 'text-gray-400' : 'text-gray-700'}`}>
                    Exclude Sundays only
                  </label>
                  <p className="text-sm text-gray-500 mt-1">
                    {settings.exclude_weekends
                      ? 'Disabled (weekends exclusion already includes Sundays)'
                      : 'Prevents bookings on Sundays only'}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.exclude_sundays}
                    disabled={settings.exclude_weekends}
                    onChange={(e) => {
                      setSettings({
                        ...settings,
                        exclude_sundays: e.target.checked,
                      });
                    }}
                    className="sr-only peer"
                  />
                  <div className={`w-11 h-6 ${settings.exclude_weekends ? 'bg-gray-100' : 'bg-gray-200'} peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 ${settings.exclude_weekends ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                </label>
              </div>

              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          )}
        </div>

        {/* Section 2: Specific Date Exclusions */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Specific Date Exclusions</h2>
          
          {/* Add Exclusion Form */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="range-mode"
                checked={isRangeMode}
                onChange={(e) => {
                  setIsRangeMode(e.target.checked);
                  if (!e.target.checked) {
                    setEndDate(null);
                  }
                }}
                className="mr-2"
              />
              <label htmlFor="range-mode" className="text-sm font-medium text-gray-700">
                Exclude date range
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isRangeMode ? 'Start Date' : 'Date'} <span className="text-red-500">*</span>
                </label>
                <DatePicker
                  selected={startDate}
                  onChange={(date: Date | null) => setStartDate(date)}
                  minDate={today}
                  maxDate={maxDate}
                  dateFormat="yyyy-MM-dd"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholderText="Select date"
                />
              </div>

              {isRangeMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    selected={endDate}
                    onChange={(date: Date | null) => setEndDate(date)}
                    minDate={startDate || today}
                    maxDate={maxDate}
                    dateFormat="yyyy-MM-dd"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholderText="Select end date"
                  />
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason (optional)
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Christmas, Holiday"
                className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handleAddExcludedDate}
              className="rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Add Exclusion
            </button>
          </div>

          {/* Filter Toggle */}
          <div className="mb-4 flex items-center">
            <input
              type="checkbox"
              id="show-past"
              checked={showPastExclusions}
              onChange={(e) => setShowPastExclusions(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="show-past" className="text-sm font-medium text-gray-700">
              Show past exclusions
            </label>
          </div>

          {/* Excluded Dates List */}
          <div className="space-y-2">
            {excludedDates.length === 0 ? (
              <p className="text-gray-500 text-sm">No excluded dates</p>
            ) : (
              excludedDates.map((excluded) => {
                const start = new Date(excluded.start_date);
                const end = excluded.end_date ? new Date(excluded.end_date) : null;
                const isPast = end
                  ? end < today
                  : start < today;

                return (
                  <div
                    key={excluded.id}
                    className={`flex items-center justify-between p-3 rounded border ${
                      isPast ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {format(start, 'MMM d, yyyy')}
                          {end && ` - ${format(end, 'MMM d, yyyy')}`}
                        </span>
                        {excluded.reason && (
                          <span className="text-sm text-gray-500">({excluded.reason})</span>
                        )}
                        {excluded.warning && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            {excluded.warning.bookingCount} booking{excluded.warning.bookingCount !== 1 ? 's' : ''}
                          </span>
                        )}
                        {isPast && (
                          <span className="text-xs text-gray-400">(Past)</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteExcludedDate(excluded.id)}
                      className="ml-4 text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
