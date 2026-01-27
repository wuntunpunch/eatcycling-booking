import { AvailabilitySettings, ExcludedDate } from './types';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

const UK_TIMEZONE = 'Europe/London';
const MAX_BOOKING_MONTHS = 6;

/**
 * Converts an ISO date string to a Date object in UK timezone
 */
export function getUKDate(dateString: string): Date {
  // Parse the date string as if it's in UK timezone
  // dateString is YYYY-MM-DD format
  const [year, month, day] = dateString.split('-').map(Number);
  // Create date at noon UK time to avoid timezone edge cases
  const ukDateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00`;
  return fromZonedTime(ukDateString, UK_TIMEZONE);
}

/**
 * Checks if a date is in the future (using UK timezone)
 */
export function isFutureDate(date: string): boolean {
  const dateObj = getUKDate(date);
  const now = toZonedTime(new Date(), UK_TIMEZONE);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const checkDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  return checkDate >= today;
}

/**
 * Checks if a date is within the maximum booking window (6 months)
 */
export function isWithinBookingWindow(date: string, maxMonths: number = MAX_BOOKING_MONTHS): boolean {
  const dateObj = getUKDate(date);
  const now = toZonedTime(new Date(), UK_TIMEZONE);
  const maxDate = new Date(now);
  maxDate.setMonth(maxDate.getMonth() + maxMonths);
  
  const checkDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  return checkDate >= today && checkDate <= maxDate;
}

/**
 * Checks if a date falls within an excluded date range (inclusive)
 */
export function isDateInRange(date: string, startDate: string, endDate: string | null): boolean {
  const checkDate = getUKDate(date);
  const start = getUKDate(startDate);
  const end = endDate ? getUKDate(endDate) : start;
  
  const check = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());
  const startCheck = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endCheck = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  
  return check >= startCheck && check <= endCheck;
}

/**
 * Checks if a date is available for booking
 * @param date - ISO date string (YYYY-MM-DD)
 * @param settings - Availability settings
 * @param excludedDates - Array of excluded dates/ranges
 * @param timezone - Timezone to use (defaults to UK)
 * @param bookingCount - Optional current booking count for this date (for service limit check)
 * @returns true if date is available, false otherwise
 */
export function isDateAvailable(
  date: string,
  settings: AvailabilitySettings,
  excludedDates: ExcludedDate[],
  timezone: string = UK_TIMEZONE,
  bookingCount?: number
): boolean {
  // Check if date is in the future
  if (!isFutureDate(date)) {
    return false;
  }

  // Check if date is within booking window
  if (!isWithinBookingWindow(date)) {
    return false;
  }

  // Check if date falls within any excluded date range
  for (const excluded of excludedDates) {
    // Only check future excluded dates
    if (isDateInRange(date, excluded.start_date, excluded.end_date)) {
      return false;
    }
  }

  // Get date in UK timezone
  const dateObj = getUKDate(date);
  const ukDate = toZonedTime(dateObj, timezone);
  const dayOfWeek = ukDate.getDay(); // 0 = Sunday, 6 = Saturday

  // Check day-of-week exclusions
  if (settings.exclude_weekends) {
    // Exclude both Saturday (6) and Sunday (0)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false;
    }
  } else if (settings.exclude_sundays) {
    // Exclude only Sunday (0)
    if (dayOfWeek === 0) {
      return false;
    }
  }

  // Check service limit if provided
  if (bookingCount !== undefined && settings.max_services_per_day !== null) {
    if (bookingCount >= settings.max_services_per_day) {
      return false;
    }
  }

  return true;
}

/**
 * Filters excluded dates to only return future dates
 */
export function filterFutureExcludedDates(excludedDates: ExcludedDate[]): ExcludedDate[] {
  const now = toZonedTime(new Date(), UK_TIMEZONE);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  return excludedDates.filter((excluded) => {
    const endDate = excluded.end_date || excluded.start_date;
    const end = getUKDate(endDate);
    const endCheck = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    return endCheck >= today;
  });
}
