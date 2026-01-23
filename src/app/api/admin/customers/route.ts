import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

export async function GET(request: NextRequest) {
  const supabase = getSupabaseClient();
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  try {
    let queryBuilder = supabase.from('customers').select('*');

    if (query && query.trim()) {
      queryBuilder = queryBuilder.or(
        `phone.ilike.%${query}%,name.ilike.%${query}%`
      );
    }

    queryBuilder = queryBuilder.limit(20).order('created_at', { ascending: false });

    const { data, error } = await queryBuilder;

    if (error) {
      console.error('Error fetching customers:', error);
      return NextResponse.json(
        { message: 'Failed to fetch customers', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ customers: data || [] });
  } catch (error) {
    console.error('Customers fetch error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
