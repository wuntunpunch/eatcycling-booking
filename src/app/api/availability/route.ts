import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AvailabilitySettingsResponse } from '@/lib/types';
import { filterFutureExcludedDates } from '@/lib/availability-helpers';

const SINGLETON_ID = '00000000-0000-0000-0000-000000000000';

function getSupabaseClient() {
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
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          excludedDates: [],
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
      return NextResponse.json(
        {
          settings,
          excludedDates: [],
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
