import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth-helpers';

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check authentication
  const auth = await checkAuth(request);
  
  if (!auth.authenticated) {
    return NextResponse.json(
      { message: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { id } = await params;
  const supabase = getSupabaseClient();
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '5', 10);
  const offset = (page - 1) * limit;

  try {
    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', id);

    if (countError) {
      console.error('Error counting bookings:', countError);
      return NextResponse.json(
        { message: 'Failed to fetch bookings', error: countError.message },
        { status: 500 }
      );
    }

    // Get paginated bookings
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('customer_id', id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching bookings:', error);
      return NextResponse.json(
        { message: 'Failed to fetch bookings', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      bookings: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Bookings fetch error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
