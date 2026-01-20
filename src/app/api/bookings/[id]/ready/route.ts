import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { sendBikeReadyNotification } from '@/lib/whatsapp';
import { ServiceType } from '@/lib/types';

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
    // Get booking with customer details
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customers(*)
      `)
      .eq('id', id)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json(
        { message: 'Booking not found' },
        { status: 404 }
      );
    }

    // Update booking status to ready
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status: 'ready' })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating booking:', updateError);
      return NextResponse.json(
        { message: 'Failed to update booking' },
        { status: 500 }
      );
    }

    // Send WhatsApp notification
    try {
      await sendBikeReadyNotification({
        customerName: booking.customer.name,
        customerPhone: booking.customer.phone,
        serviceType: booking.service_type as ServiceType,
      });
    } catch (whatsappError) {
      console.error('Error sending WhatsApp notification:', whatsappError);
      // Still return success - booking was updated
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark ready error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
