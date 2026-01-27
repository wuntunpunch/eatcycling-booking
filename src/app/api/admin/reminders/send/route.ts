import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { sendServiceReminder } from '@/lib/whatsapp';
import { ServiceType, Customer, BookingWithCustomer } from '@/lib/types';

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabaseAuth = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { bookingId, customerId } = body;

    if (!bookingId && !customerId) {
      return NextResponse.json(
        { message: 'bookingId or customerId required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Calculate reminder window
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const windowStart = new Date(sixMonthsAgo);
    windowStart.setDate(windowStart.getDate() - 14);
    
    const windowEnd = new Date(sixMonthsAgo);
    windowEnd.setDate(windowEnd.getDate() + 14);

    // Find booking(s) to send reminder for
    let query = supabase
      .from('bookings')
      .select(`
        id,
        customer_id,
        service_type,
        completed_at,
        customer:customers!inner (
          id,
          name,
          phone,
          opt_out_reminders
        )
      `)
      .eq('status', 'complete')
      .not('completed_at', 'is', null)
      .gte('completed_at', windowStart.toISOString())
      .lte('completed_at', windowEnd.toISOString())
      .is('reminder_sent_at', null);

    if (bookingId) {
      query = query.eq('id', bookingId);
    } else if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    const { data: bookings, error } = await query.order('completed_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { message: 'Database error', error: error.message },
        { status: 500 }
      );
    }

    if (!bookings || bookings.length === 0) {
      return NextResponse.json(
        { message: 'No bookings found within reminder window' },
        { status: 404 }
      );
    }

    // Group by customer and completion date
    const grouped = new Map<string, {
      customer: Customer;
      serviceTypes: ServiceType[];
      completedAt: string;
      bookingIds: string[];
    }>();

    for (const booking of bookings) {
      const customer = booking.customer as Customer;
      // Skip if customer has opted out
      if (customer?.opt_out_reminders === true) {
        continue;
      }
      const key = `${customer.id}_${new Date(booking.completed_at).toDateString()}`;
      
      if (!grouped.has(key)) {
        grouped.set(key, {
          customer,
          serviceTypes: [booking.service_type as ServiceType],
          completedAt: booking.completed_at,
          bookingIds: [booking.id],
        });
      } else {
        const existing = grouped.get(key)!;
        if (!existing.serviceTypes.includes(booking.service_type as ServiceType)) {
          existing.serviceTypes.push(booking.service_type as ServiceType);
        }
        existing.bookingIds.push(booking.id);
      }
    }

    // Send reminder for the most recent group
    const group = Array.from(grouped.values())[0];
    const { customer, serviceTypes, completedAt, bookingIds } = group;

    try {
      await sendServiceReminder({
        customerName: customer.name,
        customerPhone: customer.phone,
        completedDate: completedAt,
        serviceTypes,
      });

      // Update reminder_sent_at
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ reminder_sent_at: new Date().toISOString() })
        .in('id', bookingIds);

      if (updateError) {
        console.error('Error updating reminder_sent_at:', updateError);
      }

      // Log success
      for (const bookingId of bookingIds) {
        await supabase.from('message_logs').insert({
          booking_id: bookingId,
          customer_id: customer.id,
          message_type: 'reminder',
          recipient_phone: customer.phone,
          template_name: process.env.WHATSAPP_REMINDER_TEMPLATE_NAME,
          success: true,
        });
      }

      return NextResponse.json({
        success: true,
        message: `Reminder sent to ${customer.name}`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Log failure
      for (const bookingId of bookingIds) {
        await supabase.from('message_logs').insert({
          booking_id: bookingId,
          customer_id: customer.id,
          message_type: 'reminder',
          recipient_phone: customer.phone,
          template_name: process.env.WHATSAPP_REMINDER_TEMPLATE_NAME,
          success: false,
          error_message: errorMessage,
        });
      }

      return NextResponse.json(
        { message: 'Failed to send reminder', error: errorMessage },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error sending reminder:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
