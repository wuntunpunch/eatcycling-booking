import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth-helpers';

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

export async function PUT(
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

  try {
    const body = await request.json();
    const { bike_details } = body;

    // Verify booking exists
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json(
        { message: 'Booking not found' },
        { status: 404 }
      );
    }

    // Update bike_details
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ bike_details: bike_details ?? '' })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating bike details:', updateError);
      return NextResponse.json(
        { message: 'Failed to update bike details' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update bike details error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
