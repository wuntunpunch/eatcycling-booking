'use client';

import { useState, useEffect, useMemo } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ServiceType, SERVICE_LABELS, BookingFormData, AvailabilitySettingsResponse } from '@/lib/types';
import { isDateAvailable } from '@/lib/availability-helpers';

const SERVICES: ServiceType[] = [
  'basic_service',
  'full_service',
  'strip_and_rebuild',
  'bosch_diagnostics',
];

export default function BookingForm() {
  const [formData, setFormData] = useState<BookingFormData>({
    name: '',
    phone: '',
    email: '',
    service_type: 'basic_service',
    date: '',
    bike_details: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availabilityData, setAvailabilityData] = useState<AvailabilitySettingsResponse | null>(null);
  const [dateError, setDateError] = useState('');
  const [loadingAvailability, setLoadingAvailability] = useState(true);
  const [bookingCounts, setBookingCounts] = useState<{ [date: string]: number }>({});

  // Fetch availability settings on mount
  useEffect(() => {
    async function fetchAvailability() {
      try {
        const response = await fetch('/api/availability');
        if (response.ok) {
          const data: AvailabilitySettingsResponse = await response.json();
          setAvailabilityData(data);
          setBookingCounts(data.bookingCounts || {});
          // Debug: log booking counts to verify they're being fetched
          if (process.env.NODE_ENV === 'development') {
            console.log('Booking counts loaded:', data.bookingCounts);
            console.log('Max services per day:', data.settings.max_services_per_day);
            // Check for January 29th specifically
            if (data.bookingCounts?.['2026-01-29']) {
              console.log('Jan 29 booking count:', data.bookingCounts['2026-01-29']);
            }
          }
        } else {
          console.error('Failed to fetch availability settings');
          // Allow submission even if API fails - server will validate
        }
      } catch (error) {
        console.error('Error fetching availability:', error);
        // Allow submission even if API fails - server will validate
      } finally {
        setLoadingAvailability(false);
      }
    }
    fetchAvailability();
  }, []);

  // Validate selected date
  useEffect(() => {
    if (selectedDate && availabilityData) {
      // Format date as YYYY-MM-DD in local timezone to avoid UTC conversion issues
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      // Check if date is at capacity (should be excluded by excludeDates, but double-check)
      const bookingCount = bookingCounts[dateStr] || 0;
      const maxServices = availabilityData.settings.max_services_per_day;
      const isAtCapacity = maxServices !== null && maxServices > 0 && bookingCount >= maxServices;
      
      const available = isDateAvailable(
        dateStr,
        availabilityData.settings,
        availabilityData.excludedDates,
        'Europe/London',
        undefined // Don't check service limit here - handled by excludeDates
      );
      
      if (!available || isAtCapacity) {
        setDateError('This date is not available for booking. Please select another date.');
        setFormData((prev) => ({ ...prev, date: '' }));
        setSelectedDate(null);
      } else {
        setDateError('');
        setFormData((prev) => ({ ...prev, date: dateStr }));
      }
    } else if (selectedDate === null) {
      setFormData((prev) => ({ ...prev, date: '' }));
      setDateError('');
    }
  }, [selectedDate, availabilityData, bookingCounts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    // Final validation
    if (!formData.date) {
      setErrorMessage('Please select a date');
      setIsSubmitting(false);
      return;
    }

    if (dateError) {
      setErrorMessage(dateError);
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create booking');
      }

      setSubmitStatus('success');
      setFormData({
        name: '',
        phone: '',
        email: '',
        service_type: 'basic_service',
        date: '',
        bike_details: '',
      });
      setSelectedDate(null);
    } catch (error) {
      setSubmitStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Get date constraints
  const today = new Date();
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 6); // 6 months max booking window

  // Filter function for date picker - excludes weekends, excluded dates, etc.
  const filterDate = (date: Date) => {
    if (!availabilityData) return true; // Allow all dates if availability not loaded
    
    // Format date as YYYY-MM-DD in local timezone to avoid UTC conversion issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    // Check availability rules (excluded dates, weekends, etc.)
    // Dates at capacity are handled via excludeDates prop
    return isDateAvailable(
      dateStr,
      availabilityData.settings,
      availabilityData.excludedDates,
      'Europe/London',
      undefined // Don't check service limit here - handled by excludeDates
    );
  };

  // Get dates that are at capacity - these will be excluded (like holidays)
  // Memoized to avoid recreating array on every render
  const datesAtCapacity = useMemo((): Date[] => {
    if (!availabilityData || !bookingCounts || Object.keys(bookingCounts).length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('getDatesAtCapacity: No availabilityData or bookingCounts', {
          hasAvailabilityData: !!availabilityData,
          hasBookingCounts: !!bookingCounts,
          bookingCountsKeys: bookingCounts ? Object.keys(bookingCounts) : [],
        });
      }
      return [];
    }
    
    const dates: Date[] = [];
    const maxServices = availabilityData.settings.max_services_per_day;
    
    if (maxServices === null || maxServices === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('getDatesAtCapacity: No max services limit set', maxServices);
      }
      return dates;
    }
    
    // Check all dates in bookingCounts
    for (const [dateStr, count] of Object.entries(bookingCounts)) {
      const countNum = typeof count === 'number' ? count : parseInt(String(count), 10);
      if (countNum >= maxServices) {
        const [year, month, day] = dateStr.split('-').map(Number);
        // Create date at midnight in local timezone (important for react-datepicker matching)
        const date = new Date(year, month - 1, day, 0, 0, 0, 0);
        dates.push(date);
        
        // Debug logging
        if (process.env.NODE_ENV === 'development') {
          console.log(`Date at capacity excluded: ${dateStr} (${countNum}/${maxServices})`, {
            dateStr,
            count: countNum,
            maxServices,
            dateObject: date,
            dateISO: date.toISOString(),
          });
        }
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`Total dates at capacity to exclude: ${dates.length}`, dates);
      console.log('Full booking counts object:', JSON.stringify(bookingCounts, null, 2));
      console.log('Max services:', maxServices);
      // Specifically check for Jan 29
      if (bookingCounts['2026-01-29']) {
        console.log('Jan 29 details:', {
          count: bookingCounts['2026-01-29'],
          maxServices,
          shouldExclude: bookingCounts['2026-01-29'] >= maxServices,
        });
      }
    }
    
    return dates;
  }, [availabilityData, bookingCounts]);

  if (submitStatus === 'success') {
    return (
      <div className="rounded-lg bg-[rgba(254,19,254,0.1)] p-6 text-center border border-[rgba(254,19,254,0.2)]">
        <h2 className="text-xl font-semibold text-[#FE13FE]">Booking Confirmed!</h2>
        <p className="mt-2 text-gray-700">
          Thanks {formData.name || 'for your booking'}! We&apos;ll be in touch via WhatsApp to confirm your appointment.
        </p>
        <button
          onClick={() => {
            setSubmitStatus('idle');
            setSelectedDate(null);
          }}
          className="mt-4 rounded-md bg-[#FE13FE] px-4 py-2 text-white hover:bg-[rgba(254,19,254,0.8)]"
        >
          Book Another Service
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {submitStatus === 'error' && (
        <div className="rounded-md bg-red-50 p-4 text-red-700">
          {errorMessage}
        </div>
      )}

      <div>
        <label htmlFor="service_type" className="block text-sm font-medium text-gray-700">
          Service Type <span className="text-red-500">*</span>
        </label>
        <select
          id="service_type"
          name="service_type"
          value={formData.service_type}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-medium-blue focus:outline-none focus:ring-1 focus:ring-medium-blue"
        >
          {SERVICES.map((service) => (
            <option key={service} value={service}>
              {SERVICE_LABELS[service]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="date" className="block text-sm font-medium text-gray-700">
          Preferred Date <span className="text-red-500">*</span>
        </label>
        {loadingAvailability ? (
          <div className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm bg-gray-50">
            <span className="text-gray-500 text-sm">Loading available dates...</span>
          </div>
        ) : (
          <>
            <DatePicker
              selected={selectedDate}
              onChange={(date: Date | null) => setSelectedDate(date)}
              filterDate={filterDate}
              excludeDates={datesAtCapacity}
              minDate={today}
              maxDate={maxDate}
              dateFormat="yyyy-MM-dd"
              placeholderText="Select a date"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-medium-blue focus:outline-none focus:ring-1 focus:ring-medium-blue"
              required
            />
            {dateError && (
              <p className="mt-1 text-sm text-red-600">{dateError}</p>
            )}
            {!dateError && formData.date && (
              <p className="mt-1 text-sm text-green-600">Date selected: {formData.date}</p>
            )}
          </>
        )}
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Your Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-medium-blue focus:outline-none focus:ring-1 focus:ring-medium-blue"
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
          Phone Number <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          id="phone"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          required
          placeholder="07xxx xxxxxx"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-medium-blue focus:outline-none focus:ring-1 focus:ring-medium-blue"
        />
        <p className="mt-1 text-sm text-gray-500">We&apos;ll contact you via WhatsApp</p>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email <span className="text-gray-400">(optional)</span>
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-medium-blue focus:outline-none focus:ring-1 focus:ring-medium-blue"
        />
      </div>

      <div>
        <label htmlFor="bike_details" className="block text-sm font-medium text-gray-700">
          Bike Details <span className="text-red-500">*</span>
        </label>
        <textarea
          id="bike_details"
          name="bike_details"
          value={formData.bike_details}
          onChange={handleChange}
          required
          rows={3}
          placeholder="Make, model, any issues you've noticed..."
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-medium-blue focus:outline-none focus:ring-1 focus:ring-medium-blue"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !!dateError || !formData.date}
        className="w-full rounded-md bg-medium-blue px-4 py-3 text-white font-medium hover:bg-dark-blue focus:outline-none focus:ring-2 focus:ring-medium-blue focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Booking...' : 'Book Service'}
      </button>
    </form>
  );
}
