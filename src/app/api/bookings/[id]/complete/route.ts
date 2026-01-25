import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseClient();

  try {
    // Parse request body for skipStage option (allows pending → complete)
    const body = await request.json().catch(() => ({}));
    const skipStage = body.skipStage === true;

    // Get booking to verify it exists and check current status
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, status')
      .eq('id', id)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json(
        { message: 'Booking not found' },
        { status: 404 }
      );
    }

    // If skipStage is true and status is pending, allow direct transition to complete
    // Otherwise, only allow ready → complete
    if (!skipStage && booking.status !== 'ready') {
      return NextResponse.json(
        { message: 'Booking must be ready before marking as complete' },
        { status: 400 }
      );
    }

    // Update booking status to complete
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status: 'complete' })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating booking:', updateError);
      return NextResponse.json(
        { message: 'Failed to update booking' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark complete error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
