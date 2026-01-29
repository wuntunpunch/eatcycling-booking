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
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, addMonths } from 'date-fns';

interface ServiceLimitsData {
  max_services_per_day: number | null;
  bookingCounts: { [date: string]: number };
}

export default function ServiceLimitsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [maxServicesPerDay, setMaxServicesPerDay] = useState<number | null>(null);
  const [bookingCounts, setBookingCounts] = useState<{ [date: string]: number }>({});
  const [inputValue, setInputValue] = useState('');
  const [hasError, setHasError] = useState(false);
  const hasFetchedRef = useRef(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  
  const { showToast, ToastComponent } = useToast();
  const showToastRef = useRef(showToast);
  
  // Keep showToast ref updated
  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  const fetchData = useCallback(async () => {
    if (hasFetchedRef.current) {
      return; // Prevent concurrent fetches
    }
    hasFetchedRef.current = true;
    setLoading(true);
    
    try {
      const response = await fetchWithRetry('/api/admin/service-limits', {}, 1);

      if (response.status === 401) {
        showToastRef.current('Session expired, please log in again', 'error');
        router.push('/admin/login');
        setLoading(false);
        hasFetchedRef.current = false;
        return;
      }

      if (response.ok) {
        const data: ServiceLimitsData = await response.json();
        setMaxServicesPerDay(data.max_services_per_day);
        setBookingCounts(data.bookingCounts || {});
        setInputValue(data.max_services_per_day?.toString() || '');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        showToastRef.current(errorData.message || 'Failed to fetch service limits', 'error');
        setHasError(true);
      }
    } catch (error) {
      console.error('Error fetching service limits:', error);
      showToastRef.current('Failed to fetch service limits', 'error');
    } finally {
      setLoading(false);
      hasFetchedRef.current = false;
    }
  }, [router]);

  useEffect(() => {
    hasFetchedRef.current = false;
    if (!hasError) {
      fetchData();
    }
  }, [hasError, fetchData]);

  async function handleSave() {
    const value = inputValue.trim() === '' ? null : parseInt(inputValue, 10);
    
    if (value !== null && (isNaN(value) || value < 1)) {
      showToast('Please enter a positive number or leave empty for unlimited', 'error');
      return;
    }

    setSaving(true);
    try {
      const response = await fetchWithRetry('/api/admin/service-limits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_services_per_day: value }),
      }, 1);

      if (response.status === 401) {
        showToast('Session expired, please log in again', 'error');
        router.push('/admin/login');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setMaxServicesPerDay(data.settings.max_services_per_day);
        
        if (data.warning && data.warning.length > 0) {
          const warningDates = data.warning.map((w: { date: string; count: number }) => 
            `${format(new Date(w.date), 'MMM d')} (${w.count} bookings)`
          ).join(', ');
          showToast(
            `Limit saved. Warning: ${data.warning.length} date(s) exceed the limit: ${warningDates}`,
            'info'
          );
        } else {
          showToast('Service limit saved successfully', 'success');
        }
        fetchData();
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to save service limit', 'error');
      }
    } catch (error) {
      console.error('Error saving service limit:', error);
      showToast('Failed to save service limit', 'error');
    } finally {
      setSaving(false);
    }
  }

  function handleSetUnlimited() {
    setInputValue('');
  }

  // Get dates for the selected month
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  const today = new Date();
  const maxDate = addMonths(today, 6);
  
  // Only show dates up to 6 months in the future
  const displayEnd = monthEnd > maxDate ? maxDate : monthEnd;
  const datesInMonth = eachDayOfInterval({ start: monthStart, end: displayEnd });

  // Filter to only show future dates
  const futureDates = datesInMonth.filter(date => date >= today);

  // Get booking count for a date
  function getBookingCount(date: Date): number {
    const dateStr = format(date, 'yyyy-MM-dd');
    return bookingCounts[dateStr] || 0;
  }

  // Check if date is at capacity
  function isAtCapacity(date: Date): boolean {
    if (maxServicesPerDay === null) return false;
    return getBookingCount(date) >= maxServicesPerDay;
  }

  // Calendar day renderer
  const renderCalendarDay = (date: Date) => {
    const count = getBookingCount(date);
    const atCapacity = isAtCapacity(date);
    const isPast = date < today;
    const dateStr = format(date, 'yyyy-MM-dd');
    const isToday = isSameDay(date, today);

    if (isPast) {
      return (
        <div className="h-16 p-1 border border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-400">{format(date, 'd')}</div>
        </div>
      );
    }

    return (
      <div
        className={`h-16 p-1 border border-gray-200 rounded ${
          atCapacity ? 'bg-red-50 border-red-300' : 'bg-white hover:bg-gray-50'
        } ${isToday ? 'ring-2 ring-blue-500' : ''}`}
        title={`${format(date, 'MMM d, yyyy')}: ${count}${maxServicesPerDay ? `/${maxServicesPerDay}` : ''} bookings`}
      >
        <div className={`text-xs font-medium ${atCapacity ? 'text-red-700' : 'text-gray-700'}`}>
          {format(date, 'd')}
        </div>
        <div className={`text-xs mt-1 ${atCapacity ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
          {count}{maxServicesPerDay ? `/${maxServicesPerDay}` : ''}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <CacheSync />
        <FallbackBanner />
        <AdminHeader title="Service Limits" backLink="/admin" backLabel="Dashboard" />
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
      <AdminHeader title="Service Limits" backLink="/admin" backLabel="Dashboard" />
      <main className="mx-auto max-w-7xl px-4 py-8">
        {ToastComponent}
        
        {/* Service Limit Setting */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Maximum Services Per Day</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Limit
              </label>
              <div className="text-lg font-semibold text-gray-900">
                {maxServicesPerDay === null ? 'Unlimited' : `${maxServicesPerDay} service${maxServicesPerDay !== 1 ? 's' : ''} per day`}
              </div>
            </div>

            <div>
              <label htmlFor="max-services" className="block text-sm font-medium text-gray-700 mb-2">
                Set Maximum Services Per Day
              </label>
              <div className="flex gap-4 items-center">
                <input
                  id="max-services"
                  type="number"
                  min="1"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Leave empty for unlimited"
                  className="w-48 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={handleSetUnlimited}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Set to Unlimited
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Enter a positive number to limit bookings per day, or leave empty for unlimited bookings.
              </p>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Limit'}
            </button>
          </div>
        </div>

        {/* Calendar View */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Booking Calendar</h2>
          
          <div className="mb-4">
            <DatePicker
              selected={selectedMonth}
              onChange={(date: Date | null) => date && setSelectedMonth(date)}
              dateFormat="MMMM yyyy"
              showMonthYearPicker
              className="rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4 flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-50 border border-red-300 rounded"></div>
              <span>At capacity</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-white border border-gray-200 rounded"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 ring-2 ring-blue-500 bg-white border border-gray-200 rounded"></div>
              <span>Today</span>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-gray-700 py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before month start */}
            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="h-16"></div>
            ))}
            
            {/* Calendar days */}
            {futureDates.map((date) => (
              <div key={format(date, 'yyyy-MM-dd')}>
                {renderCalendarDay(date)}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
