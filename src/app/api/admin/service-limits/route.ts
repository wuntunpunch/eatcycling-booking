import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth-helpers';

const SINGLETON_ID = '00000000-0000-0000-0000-000000000000';

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

/**
 * Get active booking count for a specific date
 * Active bookings are those with status 'pending' or 'ready'
 * Note: Cancelled and complete bookings are excluded from capacity calculations
 */
async function getActiveBookingCount(supabase: ReturnType<typeof getSupabaseClient>, date: string): Promise<number> {
  const { count, error } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('date', date)
    .in('status', ['pending', 'ready']);

  if (error) {
    console.error('Error counting bookings for date:', date, error);
    return 0;
  }

  return count || 0;
}

/**
 * Get booking counts for all dates within the booking window (6 months)
 */
async function getBookingCounts(supabase: ReturnType<typeof getSupabaseClient>): Promise<{ [date: string]: number }> {
  const today = new Date();
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 6);

  const todayStr = today.toISOString().split('T')[0];
  const maxDateStr = maxDate.toISOString().split('T')[0];

  // Query all active bookings within the booking window
  // Active bookings are those with status 'pending' or 'ready'
  // Note: Cancelled and complete bookings are excluded from capacity calculations
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('date')
    .gte('date', todayStr)
    .lte('date', maxDateStr)
    .in('status', ['pending', 'ready']);

  if (error) {
    console.error('Error fetching booking counts:', error);
    return {};
  }

  // Group by date and count
  const counts: { [date: string]: number } = {};
  bookings?.forEach((booking) => {
    counts[booking.date] = (counts[booking.date] || 0) + 1;
  });

  return counts;
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
    // Fetch max_services_per_day from availability_settings
    const { data: settings, error: settingsError } = await supabase
      .from('availability_settings')
      .select('max_services_per_day')
      .eq('id', SINGLETON_ID)
      .single();

    if (settingsError) {
      console.error('Error fetching service limits:', settingsError);
      return NextResponse.json(
        { message: 'Failed to fetch service limits' },
        { status: 500 }
      );
    }

    // Get booking counts per date
    const bookingCounts = await getBookingCounts(supabase);

    return NextResponse.json({
      max_services_per_day: settings?.max_services_per_day ?? null,
      bookingCounts,
    });
  } catch (error) {
    console.error('Error in service limits GET API:', error);
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
    const { max_services_per_day } = body;

    // Validate input
    if (max_services_per_day !== null && max_services_per_day !== undefined) {
      if (typeof max_services_per_day !== 'number' || max_services_per_day < 1 || !Number.isInteger(max_services_per_day)) {
        return NextResponse.json(
          { message: 'max_services_per_day must be a positive integer or null' },
          { status: 400 }
        );
      }
    }

    // Get current booking counts to check for warnings
    const bookingCounts = await getBookingCounts(supabase);
    const warnings: { date: string; count: number }[] = [];

    // Check if any dates have more bookings than the new limit
    if (max_services_per_day !== null) {
      for (const [date, count] of Object.entries(bookingCounts)) {
        if (count > max_services_per_day) {
          warnings.push({ date, count });
        }
      }
    }

    // Update the singleton row
    const { data: settings, error } = await supabase
      .from('availability_settings')
      .update({ max_services_per_day: max_services_per_day ?? null })
      .eq('id', SINGLETON_ID)
      .select()
      .single();

    if (error) {
      console.error('Error updating service limits:', error);
      return NextResponse.json(
        { message: 'Failed to update service limits' },
        { status: 500 }
      );
    }

    const response: { settings: typeof settings; warning?: typeof warnings } = { settings };
    if (warnings.length > 0) {
      response.warning = warnings;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in service limits PUT API:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
