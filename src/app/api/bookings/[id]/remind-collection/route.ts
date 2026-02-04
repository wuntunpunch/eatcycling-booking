import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { sendCollectionReminder } from '@/lib/whatsapp';
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

    // Validate booking is in ready status
    if (booking.status !== 'ready') {
      return NextResponse.json(
        { message: 'Only ready bookings can receive collection reminders' },
        { status: 400 }
      );
    }

    // Validate ready_at is set and is 3+ days ago
    if (!booking.ready_at) {
      return NextResponse.json(
        { message: 'Booking does not have a ready_at timestamp' },
        { status: 400 }
      );
    }

    const readyDate = new Date(booking.ready_at);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - readyDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 3) {
      return NextResponse.json(
        { message: `Booking has only been ready for ${diffDays} day${diffDays !== 1 ? 's' : ''}. Reminders are only sent after 3 days.` },
        { status: 400 }
      );
    }

    // Send WhatsApp collection reminder
    try {
      await sendCollectionReminder({
        customerName: booking.customer.name,
        customerPhone: booking.customer.phone,
        readyDate: booking.ready_at,
        serviceType: booking.service_type as ServiceType,
        referenceNumber: booking.reference_number || undefined,
      });

      // Update collection_reminder_sent_at timestamp (only on success)
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ collection_reminder_sent_at: new Date().toISOString() })
        .eq('id', id);

      if (updateError) {
        console.error('Error updating collection_reminder_sent_at:', updateError);
        // Don't fail - message was sent
      }

      // Log successful message
      await supabase.from('message_logs').insert({
        booking_id: id,
        customer_id: booking.customer_id,
        message_type: 'collection_reminder',
        recipient_phone: booking.customer.phone,
        template_name: process.env.WHATSAPP_COLLECTION_TEMPLATE_NAME,
        success: true,
      });

      return NextResponse.json({ success: true });
    } catch (whatsappError) {
      console.error('Error sending WhatsApp notification:', whatsappError);
      
      // Log failed message (don't update collection_reminder_sent_at - allows retry)
      await supabase.from('message_logs').insert({
        booking_id: id,
        customer_id: booking.customer_id,
        message_type: 'collection_reminder',
        recipient_phone: booking.customer.phone,
        template_name: process.env.WHATSAPP_COLLECTION_TEMPLATE_NAME,
        success: false,
        error_message: whatsappError instanceof Error ? whatsappError.message : String(whatsappError),
      });

      return NextResponse.json(
        { 
          message: 'Failed to send collection reminder',
          error: whatsappError instanceof Error ? whatsappError.message : String(whatsappError)
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Remind collection error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
