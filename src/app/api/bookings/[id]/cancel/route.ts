import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { sendCancellationNotification } from '@/lib/whatsapp';
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

    // Validation: Only allow cancellation from pending status
    if (booking.status !== 'pending') {
      return NextResponse.json(
        { message: 'Only pending bookings can be cancelled' },
        { status: 400 }
      );
    }

    // Update booking status to cancelled
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
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
        await sendCancellationNotification({
          customerName: booking.customer.name,
          customerPhone: booking.customer.phone,
          serviceType: booking.service_type as ServiceType,
          date: booking.date,
          referenceNumber: booking.reference_number || undefined,
        });

        // Log successful message
        await supabase.from('message_logs').insert({
          booking_id: id,
          customer_id: booking.customer_id,
          message_type: 'cancellation',
          recipient_phone: booking.customer.phone,
          template_name: process.env.WHATSAPP_CANCELLATION_TEMPLATE_NAME,
          success: true,
        });
      } catch (whatsappError) {
        console.error('Error sending WhatsApp notification:', whatsappError);
        
        // Log failed message
        await supabase.from('message_logs').insert({
          booking_id: id,
          customer_id: booking.customer_id,
          message_type: 'cancellation',
          recipient_phone: booking.customer.phone,
          template_name: process.env.WHATSAPP_CANCELLATION_TEMPLATE_NAME,
          success: false,
          error_message: whatsappError instanceof Error ? whatsappError.message : String(whatsappError),
        });
        
        // Still return success - booking was cancelled
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cancel booking error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
