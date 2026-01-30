import { ServiceType, SERVICE_LABELS } from './types';

export interface CalendarBookingData {
  date: string; // YYYY-MM-DD format
  service_type: ServiceType;
  reference_number: string | null;
}

/**
 * Get EAT Cycling address from environment variable
 * Falls back to empty string if not set
 */
function getLocation(): string {
  if (typeof window !== 'undefined') {
    // Client-side: env vars aren't available, return empty
    return '';
  }
  // Server-side: could access process.env, but this is client-side only
  return '';
}

/**
 * Format date from YYYY-MM-DD to YYYYMMDD for calendar formats
 */
function formatDateForCalendar(dateStr: string): string {
  return dateStr.replace(/-/g, '');
}

/**
 * Get the next day for all-day event end date (exclusive)
 */
function getNextDay(dateStr: string): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generate a unique ID for calendar event
 */
function generateEventUID(date: string, reference: string | null): string {
  const timestamp = Date.now();
  const refPart = reference ? reference.replace(/[^a-zA-Z0-9]/g, '') : timestamp;
  return `${timestamp}-${refPart}@eatcycling.co.uk`;
}

/**
 * Format description with bullet points
 */
function formatDescription(serviceType: ServiceType, referenceNumber: string | null): string {
  const serviceLabel = SERVICE_LABELS[serviceType];
  const lines = [`• Service: ${serviceLabel}`];
  
  if (referenceNumber) {
    lines.push(`• Ref: ${referenceNumber}`);
  }
  
  lines.push('');
  lines.push('Drop off your bike in the morning on your selected date. You can also drop off the afternoon before if that\'s easier.');
  
  return lines.join('\n');
}

/**
 * URL encode text for use in URLs
 */
function urlEncode(text: string): string {
  return encodeURIComponent(text).replace(/'/g, '%27');
}

/**
 * Escape text for iCal format (escape commas, semicolons, backslashes, newlines)
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Generate Google Calendar URL for all-day event with reminder
 */
export function generateGoogleCalendarUrl(data: CalendarBookingData): string {
  const startDate = formatDateForCalendar(data.date);
  const endDate = formatDateForCalendar(getNextDay(data.date));
  const title = 'Bike Drop-off at EAT Cycling';
  const description = formatDescription(data.service_type, data.reference_number);
  const location = getLocation();
  
  // Calculate reminder: 1 day before at 9:00 AM
  const bookingDate = new Date(data.date);
  const reminderDate = new Date(bookingDate);
  reminderDate.setDate(reminderDate.getDate() - 1);
  reminderDate.setHours(9, 0, 0, 0);
  
  // Format for Google Calendar reminder (minutes before event)
  // For all-day events, calculate minutes from reminder time to event start
  const eventStart = new Date(bookingDate);
  eventStart.setHours(0, 0, 0, 0);
  const minutesBefore = Math.round((eventStart.getTime() - reminderDate.getTime()) / (1000 * 60));
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${startDate}/${endDate}`,
    details: description,
    location: location,
    // Add reminder: 1 day before (1440 minutes = 24 hours)
    // Note: Google Calendar may not always respect this for all-day events
    remind: '1440',
  });
  
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate iCal (.ics) file content for all-day event with reminder
 */
export function generateICalFile(data: CalendarBookingData): string {
  const startDate = formatDateForCalendar(data.date);
  const endDate = formatDateForCalendar(getNextDay(data.date));
  const title = 'Bike Drop-off at EAT Cycling';
  const description = formatDescription(data.service_type, data.reference_number);
  const location = getLocation();
  const uid = generateEventUID(data.date, data.reference_number);
  
  // DTSTAMP: current timestamp in UTC
  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
  // Calculate reminder time: 1 day before at 9:00 AM
  // For all-day events, we use an absolute date-time trigger
  const bookingDate = new Date(data.date);
  const reminderDate = new Date(bookingDate);
  reminderDate.setDate(reminderDate.getDate() - 1); // 1 day before
  reminderDate.setHours(9, 0, 0, 0); // 9:00 AM
  
  // Format reminder date for VALARM (YYYYMMDDTHHMMSSZ)
  const reminderDateStr = reminderDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EAT Cycling//Booking System//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;VALUE=DATE:${startDate}`,
    `DTEND;VALUE=DATE:${endDate}`,
    `SUMMARY:${escapeICalText(title)}`,
    `DESCRIPTION:${escapeICalText(description)}`,
    `LOCATION:${escapeICalText(location)}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `TRIGGER;VALUE=DATE-TIME:${reminderDateStr}`,
    `DESCRIPTION:${escapeICalText('Reminder: Bike Drop-off at EAT Cycling tomorrow')}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  
  return lines.join('\r\n');
}

/**
 * Download iCal file to user's device
 */
export function downloadICalFile(data: CalendarBookingData): void {
  try {
    const icsContent = generateICalFile(data);
    const filename = data.reference_number
      ? `eat-cycling-${data.reference_number.replace(/[^a-zA-Z0-9-]/g, '-')}.ics`
      : `eat-cycling-${data.date}.ics`;
    
    // Create blob and download
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading iCal file:', error);
    throw error;
  }
}

/**
 * Detect if user is on iOS device
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/**
 * Detect if user is on Android device
 */
export function isAndroid(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

/**
 * Track calendar button click (analytics)
 */
export function trackCalendarClick(type: 'google' | 'apple' | 'outlook', reference: string | null): void {
  const timestamp = new Date().toISOString();
  const refText = reference ? `Ref: ${reference}` : 'No ref';
  console.log(`[Calendar] ${type} clicked - ${refText} - ${timestamp}`);
}
