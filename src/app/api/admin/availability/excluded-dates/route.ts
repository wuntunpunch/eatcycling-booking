import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth-helpers';
import { ExcludedDate, ExcludedDateRange } from '@/lib/types';
import { isFutureDate, getUKDate } from '@/lib/availability-helpers';

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
  const { searchParams } = new URL(request.url);
  const futureOnly = searchParams.get('future_only') === 'true';

  try {
    const query = supabase
      .from('excluded_dates')
      .select('*')
      .order('start_date', { ascending: true });

    const { data: excludedDates, error } = await query;

    if (error) {
      console.error('Error fetching excluded dates:', error);
      return NextResponse.json(
        { message: 'Failed to fetch excluded dates' },
        { status: 500 }
      );
    }

    let dates = excludedDates || [];

    // Filter to future dates if requested
    if (futureOnly) {
      dates = dates.filter((excluded) => {
        const endDate = excluded.end_date || excluded.start_date;
        return isFutureDate(endDate);
      });
    }

    // Check for existing bookings on each excluded date
    const datesWithWarnings = await Promise.all(
      dates.map(async (excluded) => {
        const endDate = excluded.end_date || excluded.start_date;
        const { count } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .gte('date', excluded.start_date)
          .lte('date', endDate)
          .in('status', ['pending', 'ready']);

        return {
          ...excluded,
          warning: count && count > 0 ? { bookingCount: count } : undefined,
        };
      })
    );

    return NextResponse.json({ excludedDates: datesWithWarnings });
  } catch (error) {
    console.error('Error in admin excluded dates GET API:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    const body: ExcludedDateRange = await request.json();
    const { start_date, end_date, reason } = body;

    // Validate required fields
    if (!start_date) {
      return NextResponse.json(
        { message: 'start_date is required' },
        { status: 400 }
      );
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start_date)) {
      return NextResponse.json(
        { message: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Validate that start_date is in the future
    if (!isFutureDate(start_date)) {
      return NextResponse.json(
        { message: 'start_date must be in the future' },
        { status: 400 }
      );
    }

    // Validate end_date if provided
    if (end_date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
        return NextResponse.json(
          { message: 'Invalid end_date format. Use YYYY-MM-DD' },
          { status: 400 }
        );
      }

      const start = getUKDate(start_date);
      const end = getUKDate(end_date);
      
      if (end < start) {
        return NextResponse.json(
          { message: 'end_date must be >= start_date' },
          { status: 400 }
        );
      }

      // Validate that end_date is in the future
      if (!isFutureDate(end_date)) {
        return NextResponse.json(
          { message: 'end_date must be in the future' },
          { status: 400 }
        );
      }
    }

    // Check for existing bookings on the date range
    const endDate = end_date || start_date;
    const { count } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .gte('date', start_date)
      .lte('date', endDate)
      .in('status', ['pending', 'ready']);

    // Insert excluded date
    const { data: excludedDate, error } = await supabase
      .from('excluded_dates')
      .insert({
        start_date,
        end_date: end_date || null,
        reason: reason || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating excluded date:', error);
      return NextResponse.json(
        { message: 'Failed to create excluded date' },
        { status: 500 }
      );
    }

    // Return with warning if bookings exist
    const response: ExcludedDate & { warning?: { bookingCount: number } } = {
      ...excludedDate,
    };

    if (count && count > 0) {
      response.warning = { bookingCount: count };
    }

    return NextResponse.json({ excludedDate: response }, { status: 201 });
  } catch (error) {
    console.error('Error in admin excluded dates POST API:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  // Check authentication
  const auth = await checkAuth(request);
  
  if (!auth.authenticated) {
    return NextResponse.json(
      { message: 'Unauthorized' },
      { status: 401 }
    );
  }

  const supabase = getSupabaseClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { message: 'id query parameter is required' },
      { status: 400 }
    );
  }

  try {
    const { error } = await supabase
      .from('excluded_dates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting excluded date:', error);
      return NextResponse.json(
        { message: 'Failed to delete excluded date' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in admin excluded dates DELETE API:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
