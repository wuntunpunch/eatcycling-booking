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

    // Only allow restoring cancelled bookings
    if (booking.status !== 'cancelled') {
      return NextResponse.json(
        { message: 'Only cancelled bookings can be restored' },
        { status: 400 }
      );
    }

    // Update booking status to pending and reset all tracking fields
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ 
        status: 'pending',
        completed_at: null,
        reminder_sent_at: null,
      })
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
    console.error('Restore booking error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
