import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { sendBikeReadyNotification } from '@/lib/whatsapp';
import { ServiceType } from '@/lib/types';
import { checkAuth } from '@/lib/auth-helpers';

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

export async function POST(request: NextRequest) {
  // Check authentication
  const auth = await checkAuth(request);
  
  if (!auth.authenticated) {
    return NextResponse.json(
      { message: 'Unauthorized' },
      { status: 401 }
    );
  }

  const supabase = getSupabaseClient();

  try {
    const body = await request.json();
    const { bookingIds, action, skipWhatsApp = false, skipStage = false } = body;

    if (!Array.isArray(bookingIds) || bookingIds.length === 0) {
      return NextResponse.json(
        { message: 'Booking IDs are required' },
        { status: 400 }
      );
    }

    if (!['markReady', 'markComplete', 'skipToComplete'].includes(action)) {
      return NextResponse.json(
        { message: 'Invalid action' },
        { status: 400 }
      );
    }

    // Get all bookings with customer details
    const { data: bookings, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customers(*)
      `)
      .in('id', bookingIds);

    if (fetchError || !bookings || bookings.length === 0) {
      return NextResponse.json(
        { message: 'Bookings not found' },
        { status: 404 }
      );
    }

    const results = {
      success: [] as string[],
      failed: [] as Array<{ id: string; error: string }>,
    };

    for (const booking of bookings) {
      try {
        if (action === 'markReady') {
          // Update to ready
          const { error: updateError } = await supabase
            .from('bookings')
            .update({ status: 'ready' })
            .eq('id', booking.id);

          if (updateError) {
            results.failed.push({ id: booking.id, error: updateError.message });
            continue;
          }

          // Send WhatsApp unless skipped
          if (!skipWhatsApp) {
            try {
              await sendBikeReadyNotification({
                customerName: booking.customer.name,
                customerPhone: booking.customer.phone,
                serviceType: booking.service_type as ServiceType,
              });
            } catch (whatsappError) {
              console.error(`Error sending WhatsApp for booking ${booking.id}:`, whatsappError);
              // Still count as success - booking was updated
            }
          }

          results.success.push(booking.id);
        } else if (action === 'markComplete') {
          // Only allow ready → complete
          if (booking.status !== 'ready') {
            results.failed.push({
              id: booking.id,
              error: 'Booking must be ready before marking as complete',
            });
            continue;
          }

          const { error: updateError } = await supabase
            .from('bookings')
            .update({ status: 'complete' })
            .eq('id', booking.id);

          if (updateError) {
            results.failed.push({ id: booking.id, error: updateError.message });
            continue;
          }

          results.success.push(booking.id);
        } else if (action === 'skipToComplete') {
          // Allow pending → complete directly
          if (booking.status !== 'pending') {
            results.failed.push({
              id: booking.id,
              error: 'Can only skip to complete from pending status',
            });
            continue;
          }

          const { error: updateError } = await supabase
            .from('bookings')
            .update({ status: 'complete' })
            .eq('id', booking.id);

          if (updateError) {
            results.failed.push({ id: booking.id, error: updateError.message });
            continue;
          }

          results.success.push(booking.id);
        }
      } catch (error) {
        results.failed.push({
          id: booking.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      results: {
        succeeded: results.success.length,
        failed: results.failed.length,
        details: results,
      },
    });
  } catch (error) {
    console.error('Bulk action error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
