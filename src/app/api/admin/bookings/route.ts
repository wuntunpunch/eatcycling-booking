import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth-helpers';

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
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customers(*)
      `)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching bookings:', error);
      return NextResponse.json(
        { message: 'Failed to fetch bookings', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ bookings: data || [] });
  } catch (error) {
    console.error('Bookings fetch error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
