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

    // Get customer_id for reset logic
    const { data: bookingData, error: fetchBookingError } = await supabase
      .from('bookings')
      .select('customer_id')
      .eq('id', id)
      .single();

    if (fetchBookingError || !bookingData) {
      return NextResponse.json(
        { message: 'Failed to fetch booking data' },
        { status: 500 }
      );
    }

    // Update booking status to complete, set completed_at, and clear collection_reminder_sent_at
    // (no longer awaiting collection)
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ 
        status: 'complete',
        completed_at: new Date().toISOString(),
        collection_reminder_sent_at: null
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating booking:', updateError);
      return NextResponse.json(
        { message: 'Failed to update booking' },
        { status: 500 }
      );
    }

    // Reset logic: If customer has older completed bookings with reminder_sent_at IS NULL,
    // set reminder_sent_at = NULL on older bookings (they'll be skipped since newer booking exists)
    // This ensures only the most recent completed booking triggers a reminder
    const { error: resetError } = await supabase
      .from('bookings')
      .update({ reminder_sent_at: null })
      .eq('customer_id', bookingData.customer_id)
      .neq('id', id)
      .eq('status', 'complete')
      .is('reminder_sent_at', null)
      .lt('completed_at', new Date().toISOString());

    if (resetError) {
      // Log but don't fail - this is a best-effort optimization
      console.warn('Error resetting old reminders:', resetError);
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
