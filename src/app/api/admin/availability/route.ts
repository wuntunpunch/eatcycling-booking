import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth-helpers';
import { AvailabilitySettingsResponse } from '@/lib/types';
import { filterFutureExcludedDates } from '@/lib/availability-helpers';

const SINGLETON_ID = '00000000-0000-0000-0000-000000000000';

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

export async function GET(request: NextRequest) {
  // Check authentication
  const auth = await checkAuth(request);
  
  if (!auth.authenticated) {
    return NextResponse.json(
      { message: 'Unauthorized' },
      { status: 401 }
    );
  }

  const supabase = getSupabaseClient();

  try {
    const { searchParams } = new URL(request.url);
    const futureOnly = searchParams.get('future_only') === 'true';

    // Fetch availability settings (singleton)
    const { data: settings, error: settingsError } = await supabase
      .from('availability_settings')
      .select('*')
      .eq('id', SINGLETON_ID)
      .single();

    if (settingsError) {
      console.error('Error fetching availability settings:', settingsError);
      // Check if it's a table not found error
      if (settingsError?.code === 'PGRST205' || settingsError?.message?.includes('table')) {
        return NextResponse.json(
          { 
            message: 'Database tables not found. Please run migration 006_add_availability_settings.sql in Supabase.',
            error: 'TABLE_NOT_FOUND'
          },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { message: 'Failed to fetch availability settings', error: settingsError?.message },
        { status: 500 }
      );
    }

    // If no settings found, create default
    let finalSettings = settings;
    if (!settings) {
      console.log('No settings found, creating default');
      const { data: newSettings, error: insertError } = await supabase
        .from('availability_settings')
        .insert({
          id: SINGLETON_ID,
          exclude_weekends: true,
          exclude_sundays: false,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating default settings:', insertError);
        return NextResponse.json(
          { message: 'Failed to initialize availability settings', error: insertError?.message },
          { status: 500 }
        );
      }
      // Use the newly created settings
      finalSettings = newSettings;
    }

    // Fetch excluded dates
    const { data: excludedDates, error: datesError } = await supabase
      .from('excluded_dates')
      .select('*')
      .order('start_date', { ascending: true });

    if (datesError) {
      console.error('Error fetching excluded dates:', datesError);
      return NextResponse.json(
        { message: 'Failed to fetch excluded dates' },
        { status: 500 }
      );
    }

    // Filter to future dates if requested
    const filteredDates = futureOnly
      ? filterFutureExcludedDates(excludedDates || [])
      : excludedDates || [];

    return NextResponse.json({
      settings: finalSettings,
      excludedDates: filteredDates,
    } as AvailabilitySettingsResponse);
  } catch (error) {
    console.error('Error in admin availability API:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  // Check authentication
  const auth = await checkAuth(request);
  
  if (!auth.authenticated) {
    return NextResponse.json(
      { message: 'Unauthorized' },
      { status: 401 }
    );
  }

  const supabase = getSupabaseClient();

  try {
    const body = await request.json();
    const { exclude_weekends, exclude_sundays } = body;

    // Validate input
    if (exclude_weekends === undefined && exclude_sundays === undefined) {
      return NextResponse.json(
        { message: 'At least one field must be provided' },
        { status: 400 }
      );
    }

    // Build update object
    const updates: { exclude_weekends?: boolean; exclude_sundays?: boolean } = {};
    if (exclude_weekends !== undefined) {
      updates.exclude_weekends = Boolean(exclude_weekends);
      // If exclude_weekends is enabled, automatically set exclude_sundays to false
      if (exclude_weekends === true) {
        updates.exclude_sundays = false;
      }
    }
    if (exclude_sundays !== undefined && updates.exclude_sundays === undefined) {
      updates.exclude_sundays = Boolean(exclude_sundays);
    }

    // Update the singleton row
    const { data: settings, error } = await supabase
      .from('availability_settings')
      .update(updates)
      .eq('id', SINGLETON_ID)
      .select()
      .single();

    if (error) {
      console.error('Error updating availability settings:', error);
      return NextResponse.json(
        { message: 'Failed to update availability settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error in admin availability PUT API:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
