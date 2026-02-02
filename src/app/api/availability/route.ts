import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AvailabilitySettingsResponse } from '@/lib/types';
import { filterFutureExcludedDates } from '@/lib/availability-helpers';

const SINGLETON_ID = '00000000-0000-0000-0000-000000000000';

function getSupabaseClient() {
  // Use public key - RLS policy allows reading booking dates/status for availability
  // Migration 008_add_public_booking_counts_policy.sql adds the necessary policy
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}

export async function GET() {
  const supabase = getSupabaseClient();

  try {
    // Fetch availability settings (singleton)
    const { data: settings, error: settingsError } = await supabase
      .from('availability_settings')
      .select('*')
      .eq('id', SINGLETON_ID)
      .single();

    if (settingsError || !settings) {
      console.error('Error fetching availability settings:', settingsError);
      // Return default settings if not found
      return NextResponse.json(
        {
          settings: {
            id: SINGLETON_ID,
            exclude_weekends: true,
            exclude_sundays: false,
            max_services_per_day: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          excludedDates: [],
          bookingCounts: {},
        } as AvailabilitySettingsResponse,
        {
          status: 200,
          headers: {
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          },
        }
      );
    }

    // Fetch excluded dates (only future dates for public API)
    const { data: excludedDates, error: datesError } = await supabase
      .from('excluded_dates')
      .select('*')
      .order('start_date', { ascending: true });

    if (datesError) {
      console.error('Error fetching excluded dates:', datesError);
    }

    // Get booking counts regardless of excluded dates fetch status
    const today = new Date();
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 6);
    const todayStr = today.toISOString().split('T')[0];
    const maxDateStr = maxDate.toISOString().split('T')[0];

    // Query active bookings (pending and ready) within booking window
    // Note: Cancelled and complete bookings are excluded from capacity calculations
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('date, status')
      .gte('date', todayStr)
      .lte('date', maxDateStr)
      .in('status', ['pending', 'ready']);

    // Group by date and count
    const bookingCounts: { [date: string]: number } = {};
    if (bookingsError) {
      console.error('Error fetching bookings for counts:', bookingsError);
    } else if (bookings) {
      console.log(`Found ${bookings.length} active bookings in date range`);
      bookings.forEach((booking) => {
        // Ensure date is in YYYY-MM-DD format (handle potential timestamp format)
        const dateStr = typeof booking.date === 'string' ? booking.date.split('T')[0] : booking.date;
        bookingCounts[dateStr] = (bookingCounts[dateStr] || 0) + 1;
        console.log(`Booking count for ${dateStr}: ${bookingCounts[dateStr]}`);
      });
      console.log('Final bookingCounts:', bookingCounts);
    } else {
      console.log('No bookings found or bookings is null');
    }

    if (datesError) {
      // Return with empty excluded dates but include booking counts
      return NextResponse.json(
        {
          settings,
          excludedDates: [],
          bookingCounts,
        } as AvailabilitySettingsResponse,
        {
          status: 200,
          headers: {
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          },
        }
      );
    }

    // Filter to only future dates
    const futureDates = filterFutureExcludedDates(excludedDates || []);

    return NextResponse.json(
      {
        settings,
        excludedDates: futureDates,
        bookingCounts,
      } as AvailabilitySettingsResponse,
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('Error in availability API:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
