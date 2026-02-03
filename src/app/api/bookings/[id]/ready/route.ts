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
    // Parse request body for skipWhatsApp option
    const body = await request.json().catch(() => ({}));
    const skipWhatsApp = body.skipWhatsApp === true;

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

    // Update booking status to ready, set ready_at timestamp, and clear collection_reminder_sent_at
    // Always reset ready_at to NOW() when marking ready (even if previously set)
    // Clear collection_reminder_sent_at for fresh start
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ 
        status: 'ready',
        ready_at: new Date().toISOString(),
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

    // Send WhatsApp notification unless skipped
    if (!skipWhatsApp) {
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
