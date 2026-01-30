import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { BookingFormData } from '@/lib/types';
import { createCalendarEvent } from '@/lib/google-calendar';
import { sendBookingConfirmation } from '@/lib/whatsapp';
import {
  isDateAvailable,
  isFutureDate,
  isWithinBookingWindow,
} from '@/lib/availability-helpers';
import { checkAuth } from '@/lib/auth-helpers';
import { generateReferenceNumber } from '@/lib/booking-helpers';

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

    // Check for override parameter (admin only)
    const { searchParams } = new URL(request.url);
    const overrideAvailability = searchParams.get('override_availability') === 'true';
    
    let shouldOverride = false;
    if (overrideAvailability) {
      const auth = await checkAuth(request);
      if (auth.authenticated) {
        shouldOverride = true;
        console.log('Availability override used by admin:', auth.email);
      }
    }

    // Validate date availability (unless overridden)
    if (!shouldOverride) {
      // Fetch availability settings
      const { data: settings, error: settingsError } = await supabase
        .from('availability_settings')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000000')
        .single();

      if (settingsError) {
        console.error('Error fetching availability settings:', settingsError);
        // Don't fail booking if settings fetch fails - allow it through
      } else {
        // Fetch excluded dates (only future dates)
        const today = new Date().toISOString().split('T')[0];
        const { data: excludedDates } = await supabase
          .from('excluded_dates')
          .select('*')
          .gte('start_date', today);

        // Validate date is in the future
        if (!isFutureDate(body.date)) {
          return NextResponse.json(
            { message: 'Please select a future date' },
            { status: 400 }
          );
        }

        // Validate date is within booking window (6 months)
        if (!isWithinBookingWindow(body.date, 6)) {
          return NextResponse.json(
            { message: 'Please select a date within the next 6 months' },
            { status: 400 }
          );
        }

        // Validate date is available
        if (!isDateAvailable(body.date, settings, excludedDates || [])) {
          return NextResponse.json(
            { message: 'This date is not available for booking. Please select another date.' },
            { status: 400 }
          );
        }

        // Check service limit (if set)
        if (settings.max_services_per_day !== null) {
          // Count active bookings for this date (pending and ready statuses)
          const { count, error: countError } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('date', body.date)
            .in('status', ['pending', 'ready']);

          if (!countError && count !== null) {
            if (count >= settings.max_services_per_day) {
              return NextResponse.json(
                { message: 'This date is not available for booking. Please select another date.' },
                { status: 400 }
              );
            }
          }
        }
      }
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

    // Generate reference number (optional - booking succeeds even if this fails)
    const bookingYear = new Date(body.date).getFullYear();
    let referenceNumber: string | null = null;
    try {
      referenceNumber = await generateReferenceNumber(supabase, bookingYear);
      if (!referenceNumber) {
        console.warn('Reference number generation failed, continuing without reference');
      }
    } catch (error) {
      console.error('Error generating reference number:', error);
      // Continue without reference - booking succeeds
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
        reference_number: referenceNumber,
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
        referenceNumber: referenceNumber || undefined,
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
    const response: { booking: typeof booking; whatsappSent?: boolean; whatsappError?: string } = { booking };
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
