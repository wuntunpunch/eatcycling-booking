import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { sendServiceReminder } from '@/lib/whatsapp';
import { sendReminderFailureAlert, sendCronFailureAlert } from '@/lib/email';
import { ServiceType, Customer, BookingWithCustomer } from '@/lib/types';

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

function logMessage(
  supabase: ReturnType<typeof getSupabaseClient>,
  data: {
    booking_id?: string;
    customer_id: string;
    message_type: 'reminder' | 'confirmation' | 'ready';
    recipient_phone: string;
    template_name?: string;
    success: boolean;
    error_message?: string;
    whatsapp_message_id?: string;
    api_response?: Record<string, unknown>;
    estimated_cost?: number;
  }
) {
  return supabase.from('message_logs').insert(data);
}

export async function GET(request: NextRequest) {
  // Verify this is a legitimate Vercel cron request
  // Vercel automatically adds x-vercel-cron header for cron jobs
  const cronHeader = request.headers.get('x-vercel-cron');
  const cronSecret = request.headers.get('authorization')?.replace('Bearer ', '') ||
                     request.nextUrl.searchParams.get('secret');
  
  // Allow if it's a Vercel cron job OR if it matches CRON_SECRET (for manual testing)
  const isVercelCron = cronHeader === '1';
  const isValidSecret = process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET;
  
  if (!isVercelCron && !isValidSecret) {
    console.error('Invalid cron request - missing x-vercel-cron header or invalid secret');
    return NextResponse.json(
      { message: 'Unauthorized' },
      { status: 401 }
    );
  }

  const supabase = getSupabaseClient();
  const batchSize = parseInt(process.env.REMINDER_BATCH_SIZE || '20', 10);

  try {
    // Calculate date range: 5.8 to 6.2 months ago (2-week window)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const windowStart = new Date(sixMonthsAgo);
    windowStart.setDate(windowStart.getDate() - 14); // 2 weeks before
    
    const windowEnd = new Date(sixMonthsAgo);
    windowEnd.setDate(windowEnd.getDate() + 14); // 2 weeks after

    // Query for customers due reminders
    // Get most recent completed booking per customer within the window
    const { data: bookings, error: queryError } = await supabase
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
      .is('reminder_sent_at', null)
      .order('completed_at', { ascending: false })
      .limit(1000); // Get more than batch size to filter for most recent per customer

    if (queryError) {
      console.error('Error querying bookings:', queryError);
      await sendCronFailureAlert(`Database query error: ${queryError.message}`);
      return NextResponse.json(
        { message: 'Database error', error: queryError.message },
        { status: 500 }
      );
    }

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({
        sent: 0,
        failed: 0,
        skipped: 0,
        message: 'No reminders due',
      });
    }

    // Filter to get only most recent completed booking per customer
    // Also filter out customers who have opted out
    const customerMap = new Map<string, BookingWithCustomer>();
    for (const booking of bookings) {
      const customer = booking.customer as Customer;
      // Skip if customer has opted out
      if (customer?.opt_out_reminders === true) {
        continue;
      }
      const customerId = booking.customer_id;
      if (!customerMap.has(customerId)) {
        customerMap.set(customerId, booking);
      }
    }

    // Convert to array and limit to batch size
    const bookingsToProcess = Array.from(customerMap.values())
      .slice(0, batchSize);

    // Group bookings by customer and completion date to handle multiple services same day
    const groupedBookings = new Map<string, {
      customer: Customer;
      serviceTypes: ServiceType[];
      completedAt: string;
      bookingIds: string[];
    }>();

    for (const booking of bookingsToProcess) {
      const customer = booking.customer as Customer;
      const key = `${customer.id}_${new Date(booking.completed_at).toDateString()}`;
      
      if (!groupedBookings.has(key)) {
        groupedBookings.set(key, {
          customer,
          serviceTypes: [booking.service_type as ServiceType],
          completedAt: booking.completed_at,
          bookingIds: [booking.id],
        });
      } else {
        const existing = groupedBookings.get(key)!;
        if (!existing.serviceTypes.includes(booking.service_type as ServiceType)) {
          existing.serviceTypes.push(booking.service_type as ServiceType);
        }
        existing.bookingIds.push(booking.id);
      }
    }

    let sent = 0;
    let failed = 0;
    const failureCounts = new Map<string, number>();

    // Process each customer
    for (const [key, group] of groupedBookings) {
      const { customer, serviceTypes, completedAt, bookingIds } = group;
      
      try {
        // Send reminder
        const response = await sendServiceReminder({
          customerName: customer.name,
          customerPhone: customer.phone,
          completedDate: completedAt,
          serviceTypes,
        });

        // Update reminder_sent_at for all bookings in this group
        const { error: updateError } = await supabase
          .from('bookings')
          .update({ reminder_sent_at: new Date().toISOString() })
          .in('id', bookingIds);

        if (updateError) {
          console.error('Error updating reminder_sent_at:', updateError);
        }

        // Log success
        for (const bookingId of bookingIds) {
          await logMessage(supabase, {
            booking_id: bookingId,
            customer_id: customer.id,
            message_type: 'reminder',
            recipient_phone: customer.phone,
            template_name: process.env.WHATSAPP_REMINDER_TEMPLATE_NAME,
            success: true,
            whatsapp_message_id: response?.messages?.[0]?.id,
            api_response: response,
          });
        }

        sent++;
        console.log(`Reminder sent to ${customer.name} (${customer.phone})`);
      } catch (error) {
        failed++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Failed to send reminder to ${customer.name}:`, errorMessage);

        // Track consecutive failures
        const currentFailures = failureCounts.get(customer.id) || 0;
        const newFailureCount = currentFailures + 1;
        failureCounts.set(customer.id, newFailureCount);

        // Log failure
        for (const bookingId of bookingIds) {
          await logMessage(supabase, {
            booking_id: bookingId,
            customer_id: customer.id,
            message_type: 'reminder',
            recipient_phone: customer.phone,
            template_name: process.env.WHATSAPP_REMINDER_TEMPLATE_NAME,
            success: false,
            error_message: errorMessage,
            api_response: error instanceof Error ? { message: error.message } : error,
          });
        }

        // Send alert if 3+ consecutive failures
        if (newFailureCount >= 3) {
          await sendReminderFailureAlert(
            customer.id,
            customer.name,
            customer.phone,
            newFailureCount,
            errorMessage,
            bookingIds[0]
          );
        }
      }
    }

    return NextResponse.json({
      sent,
      failed,
      skipped: bookingsToProcess.length - sent - failed,
      total_due: customerMap.size,
      message: `Processed ${sent} reminders, ${failed} failed`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Cron job error:', error);
    await sendCronFailureAlert(`Cron job error: ${errorMessage}`);
    return NextResponse.json(
      { message: 'Internal server error', error: errorMessage },
      { status: 500 }
    );
  }
}
