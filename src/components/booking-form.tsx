'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ServiceType, SERVICE_LABELS, BookingFormData, AvailabilitySettingsResponse } from '@/lib/types';
import { isDateAvailable } from '@/lib/availability-helpers';
import { useToast } from '@/components/toast';
import {
  generateGoogleCalendarUrl,
  generateICalFile,
  downloadICalFile,
  isIOS,
  isAndroid,
  trackCalendarClick,
  type CalendarBookingData,
} from '@/lib/calendar-links';

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
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [bookingCounts, setBookingCounts] = useState<{ [date: string]: number }>({});
  const [bookingReference, setBookingReference] = useState<string | null>(null);
  const [bookingData, setBookingData] = useState<CalendarBookingData | null>(null);
  const [calendarError, setCalendarError] = useState(false);
  const { showToast, ToastComponent } = useToast();

  // Device detection for smart calendar button display
  const deviceType = useMemo(() => {
    if (isIOS()) return 'ios';
    if (isAndroid()) return 'android';
    return 'desktop';
  }, []);

  // Fetch availability when user opens the date picker (lazy load for fresh data)
  const fetchAvailability = useCallback(async () => {
    setLoadingAvailability(true);
    try {
      const response = await fetch('/api/availability');
      if (response.ok) {
        const data: AvailabilitySettingsResponse = await response.json();
        setAvailabilityData(data);
        setBookingCounts(data.bookingCounts || {});
        if (process.env.NODE_ENV === 'development') {
          console.log('Booking counts loaded:', data.bookingCounts);
          console.log('Max services per day:', data.settings.max_services_per_day);
          if (data.bookingCounts?.['2026-01-29']) {
            console.log('Jan 29 booking count:', data.bookingCounts['2026-01-29']);
          }
        }
      } else {
        console.error('Failed to fetch availability settings');
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setLoadingAvailability(false);
    }
  }, []);

  const handleCalendarOpen = useCallback(() => {
    fetchAvailability();
  }, [fetchAvailability]);

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

      const result = await response.json();
      const booking = result.booking;
      
      // Store booking data for calendar integration
      const bookingRef = booking?.reference_number || null;
      setBookingReference(bookingRef);
      
      // Store calendar booking data before clearing form
      if (booking?.date && booking?.service_type) {
        setBookingData({
          date: booking.date,
          service_type: booking.service_type,
          reference_number: bookingRef,
        });
        
        // Test calendar generation - hide section if it fails
        try {
          generateGoogleCalendarUrl({
            date: booking.date,
            service_type: booking.service_type,
            reference_number: bookingRef,
          });
          generateICalFile({
            date: booking.date,
            service_type: booking.service_type,
            reference_number: bookingRef,
          });
          setCalendarError(false);
        } catch (error) {
          console.error('Calendar generation test failed:', error);
          setCalendarError(true);
        }
      } else {
        setCalendarError(true);
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
    if (!availabilityData) return false; // No dates selectable until availability loads
    
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

  const handleCopyReference = async (reference: string) => {
    try {
      await navigator.clipboard.writeText(reference);
      showToast('Reference copied to clipboard', 'success');
    } catch (error) {
      console.error('Failed to copy:', error);
      showToast('Failed to copy reference', 'error');
    }
  };

  if (submitStatus === 'success') {
    return (
      <>
        {ToastComponent}
        <div className="rounded-lg bg-[rgba(254,19,254,0.1)] p-6 text-center border border-[rgba(254,19,254,0.2)]">
          <h2 className="text-xl font-semibold text-[#FE13FE]">Booking Confirmed!</h2>
          <p className="mt-2 text-gray-700">
            Thanks {formData.name || 'for your booking'}! We&apos;ll be in touch via WhatsApp to confirm your appointment.
          </p>
          {bookingReference && (
            <div className="mt-4 p-4 bg-white rounded-md border border-gray-200">
              <p className="text-sm text-gray-600 mb-2">Your booking reference:</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg md:text-xl font-mono font-semibold text-gray-900">
                  {bookingReference}
                </span>
                <button
                  onClick={() => handleCopyReference(bookingReference)}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                  aria-label="Copy reference number"
                  title="Copy reference number"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Please quote this reference when dropping off your bike
              </p>
            </div>
          )}
          {!calendarError && bookingData && (
            <div className="mt-6">
              <p className="text-sm text-gray-600 mb-3">Add to your calendar:</p>
              <div className="flex flex-row gap-4 justify-center items-start">
                {/* Google Calendar Button */}
                <button
                  onClick={() => {
                    if (!bookingData) return;
                    try {
                      trackCalendarClick('google', bookingData.reference_number);
                      const url = generateGoogleCalendarUrl(bookingData);
                      window.open(url, '_blank', 'noopener,noreferrer');
                    } catch (error) {
                      console.error('Error opening Google Calendar:', error);
                      showToast('Failed to open Google Calendar', 'error');
                    }
                  }}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg hover:opacity-90 transition-opacity ${
                    deviceType === 'android' ? 'bg-[#FE13FE]' : 'bg-[#4285F4]'
                  }`}
                  aria-label="Add to Google Calendar"
                  title="Add to Google Calendar"
                >
                  <svg
                    className="w-6 h-6 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5v-5z" />
                  </svg>
                  <span className="text-xs text-white font-medium">Google</span>
                </button>
                
                {/* Apple Calendar Button */}
                <button
                  onClick={() => {
                    if (!bookingData) return;
                    try {
                      trackCalendarClick('apple', bookingData.reference_number);
                      downloadICalFile(bookingData);
                    } catch (error) {
                      console.error('Error downloading Apple Calendar file:', error);
                      showToast('Failed to download calendar file', 'error');
                    }
                  }}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg hover:opacity-90 transition-opacity ${
                    deviceType === 'ios' ? 'bg-[#FE13FE]' : 'bg-gray-600'
                  }`}
                  aria-label="Add to Apple Calendar"
                  title="Add to Apple Calendar"
                >
                  <svg
                    className="w-6 h-6 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-2 5h-5v5h5v-5z" />
                  </svg>
                  <span className="text-xs text-white font-medium">Apple</span>
                </button>
                
                {/* Outlook Button */}
                <button
                  onClick={() => {
                    if (!bookingData) return;
                    try {
                      trackCalendarClick('outlook', bookingData.reference_number);
                      downloadICalFile(bookingData);
                    } catch (error) {
                      console.error('Error downloading Outlook calendar file:', error);
                      showToast('Failed to download calendar file', 'error');
                    }
                  }}
                  className="flex flex-col items-center gap-1 p-3 rounded-lg bg-[#0078D4] hover:opacity-90 transition-opacity"
                  aria-label="Add to Outlook"
                  title="Add to Outlook"
                >
                  <svg
                    className="w-6 h-6 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M7.5 6.5v11L12 20l4.5-2.5v-11L12 4 7.5 6.5zm5.5 2.5l3 1.5v6l-3 1.5-3-1.5v-6l3-1.5z" />
                  </svg>
                  <span className="text-xs text-white font-medium">Outlook</span>
                </button>
              </div>
            </div>
          )}
          <button
            onClick={() => {
              setSubmitStatus('idle');
              setSelectedDate(null);
              setBookingReference(null);
              setBookingData(null);
              setCalendarError(false);
            }}
            className="mt-4 rounded-md bg-[#FE13FE] px-4 py-2 text-white hover:bg-[rgba(254,19,254,0.8)]"
          >
            Book Another Service
          </button>
        </div>
      </>
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
        <DatePicker
          selected={selectedDate}
          onChange={(date: Date | null) => setSelectedDate(date)}
          onCalendarOpen={handleCalendarOpen}
          filterDate={filterDate}
          excludeDates={datesAtCapacity}
          minDate={today}
          maxDate={maxDate}
          dateFormat="yyyy-MM-dd"
          placeholderText="Select a date"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-medium-blue focus:outline-none focus:ring-1 focus:ring-medium-blue"
          renderCustomHeader={({
            monthDate,
            decreaseMonth,
            increaseMonth,
            prevMonthButtonDisabled,
            nextMonthButtonDisabled,
          }) => (
            <div className="react-datepicker__header">
              {loadingAvailability ? (
                <span className="react-datepicker__current-month text-gray-500 text-sm">
                  Loading available dates...
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={decreaseMonth}
                    disabled={prevMonthButtonDisabled}
                    className="react-datepicker__navigation react-datepicker__navigation--previous"
                    aria-label="Previous Month"
                  />
                  <span className="react-datepicker__current-month">
                    {monthDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                  </span>
                  <button
                    type="button"
                    onClick={increaseMonth}
                    disabled={nextMonthButtonDisabled}
                    className="react-datepicker__navigation react-datepicker__navigation--next"
                    aria-label="Next Month"
                  />
                </>
              )}
            </div>
          )}
          required
        />
        {dateError && (
          <p className="mt-1 text-sm text-red-600">{dateError}</p>
        )}
        <p className="mt-2 text-sm text-gray-600 italic">
          Drop off your bike in the morning on your selected date. You can also drop off the afternoon before if that&apos;s easier.
        </p>
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
