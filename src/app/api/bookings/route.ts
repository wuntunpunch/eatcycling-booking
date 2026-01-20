import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { BookingFormData } from '@/lib/types';
import { createCalendarEvent } from '@/lib/google-calendar';
import { sendBookingConfirmation } from '@/lib/whatsapp';

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseClient();

  try {
    const body: BookingFormData = await request.json();

    // Validate required fields
    if (!body.name || !body.phone || !body.service_type || !body.date || !body.bike_details) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Normalize phone number (remove spaces/dashes)
    const normalizedPhone = body.phone.replace(/[\s-]/g, '');

    // Find or create customer by phone number
    let { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', normalizedPhone)
      .single();

    if (!customer) {
      // Create new customer
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          phone: normalizedPhone,
          name: body.name,
          email: body.email || null,
        })
        .select('id')
        .single();

      if (customerError) {
        console.error('Error creating customer:', customerError);
        return NextResponse.json(
          { message: 'Failed to create customer' },
          { status: 500 }
        );
      }
      customer = newCustomer;
    } else {
      // Update customer name/email if they've changed
      await supabase
        .from('customers')
        .update({
          name: body.name,
          email: body.email || null,
        })
        .eq('id', customer.id);
    }

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        customer_id: customer.id,
        service_type: body.service_type,
        date: body.date,
        bike_details: body.bike_details,
        status: 'pending',
      })
      .select()
      .single();

    if (bookingError) {
      console.error('Error creating booking:', bookingError);
      return NextResponse.json(
        { message: 'Failed to create booking' },
        { status: 500 }
      );
    }

    // Add Google Calendar event
    try {
      await createCalendarEvent({
        customerName: body.name,
        customerPhone: normalizedPhone,
        serviceType: body.service_type,
        date: body.date,
        bikeDetails: body.bike_details,
      });
    } catch (calendarError) {
      console.error('Error creating calendar event:', calendarError);
      // Don't fail the booking if calendar fails
    }

    // Send WhatsApp confirmation
    let whatsappError: Error | null = null;
    try {
      await sendBookingConfirmation({
        customerName: body.name,
        customerPhone: normalizedPhone,
        serviceType: body.service_type,
        date: body.date,
      });
      console.log('WhatsApp confirmation sent successfully to', normalizedPhone);
    } catch (error) {
      whatsappError = error instanceof Error ? error : new Error(String(error));
      console.error('Error sending WhatsApp confirmation:', {
        error: whatsappError.message,
        stack: whatsappError.stack,
        phone: normalizedPhone,
      });
      // Don't fail the booking if WhatsApp fails, but log it
    }

    // Include WhatsApp status in response for debugging (only in development)
    const response: { booking: any; whatsappSent?: boolean; whatsappError?: string } = { booking };
    if (process.env.NODE_ENV === 'development') {
      response.whatsappSent = !whatsappError;
      if (whatsappError) {
        response.whatsappError = whatsappError.message;
      }
    }

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Booking error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
