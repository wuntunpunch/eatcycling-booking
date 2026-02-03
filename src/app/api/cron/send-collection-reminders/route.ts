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

function logMessage(
  supabase: ReturnType<typeof getSupabaseClient>,
  data: {
    booking_id?: string;
    customer_id: string;
    message_type: 'collection_reminder';
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

  try {
    // Find bookings that are ready, have ready_at set, are 3+ days old,
    // and either have no reminder sent or last reminder was 3+ days ago
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const threeDaysAgoISO = threeDaysAgo.toISOString();

    const { data: bookings, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customers(*)
      `)
      .eq('status', 'ready')
      .not('ready_at', 'is', null)
      .lt('ready_at', threeDaysAgoISO)
      .or(`collection_reminder_sent_at.is.null,collection_reminder_sent_at.lt.${threeDaysAgoISO}`);

    if (fetchError) {
      console.error('Error fetching bookings for collection reminders:', fetchError);
      return NextResponse.json(
        { message: 'Failed to fetch bookings', error: fetchError.message },
        { status: 500 }
      );
    }

    if (!bookings || bookings.length === 0) {
      console.log('No bookings eligible for collection reminders');
      return NextResponse.json({
        success: true,
        message: 'No bookings eligible for collection reminders',
        remindersSent: 0,
      });
    }

    console.log(`Found ${bookings.length} booking(s) eligible for collection reminders`);

    let succeeded = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process each booking
    for (const booking of bookings) {
      try {
        // Send collection reminder
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
          .eq('id', booking.id);

        if (updateError) {
          console.error(`Error updating collection_reminder_sent_at for booking ${booking.id}:`, updateError);
          // Don't fail - message was sent
        }

        // Log successful message
        await logMessage(supabase, {
          booking_id: booking.id,
          customer_id: booking.customer_id,
          message_type: 'collection_reminder',
          recipient_phone: booking.customer.phone,
          template_name: process.env.WHATSAPP_COLLECTION_TEMPLATE_NAME,
          success: true,
        });

        succeeded++;
        console.log(`Collection reminder sent for booking ${booking.id} (${booking.customer.name})`);
      } catch (error) {
        failed++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Booking ${booking.id}: ${errorMessage}`);

        // Log failed message (don't update collection_reminder_sent_at - allows retry)
        await logMessage(supabase, {
          booking_id: booking.id,
          customer_id: booking.customer_id,
          message_type: 'collection_reminder',
          recipient_phone: booking.customer.phone,
          template_name: process.env.WHATSAPP_COLLECTION_TEMPLATE_NAME,
          success: false,
          error_message: errorMessage,
        });

        console.error(`Error sending collection reminder for booking ${booking.id}:`, error);
      }
    }

    const result = {
      success: true,
      remindersSent: succeeded,
      remindersFailed: failed,
      totalEligible: bookings.length,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log(`Collection reminders cron completed: ${succeeded} sent, ${failed} failed`);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Collection reminders cron error:', error);
    return NextResponse.json(
      { 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
