import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { Customer, BookingWithCustomer } from '@/lib/types';

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

export async function GET(request: NextRequest) {
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

    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'due'; // 'due', 'sent', 'failed', 'stats'

    if (type === 'due') {
      // Get customers due for reminders (within 2-week window)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const windowStart = new Date(sixMonthsAgo);
      windowStart.setDate(windowStart.getDate() - 14);
      
      const windowEnd = new Date(sixMonthsAgo);
      windowEnd.setDate(windowEnd.getDate() + 14);

      const { data, error } = await supabase
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
        .order('completed_at', { ascending: false });

      if (error) {
        return NextResponse.json(
          { message: 'Database error', error: error.message },
          { status: 500 }
        );
      }

      // Group by customer and completion date
      // Filter out customers who have opted out
      const grouped = new Map();
      for (const booking of data || []) {
        const customer = booking.customer as Customer;
        // Skip if customer has opted out
        if (customer?.opt_out_reminders === true) {
          continue;
        }
        const key = `${customer.id}_${new Date(booking.completed_at).toDateString()}`;
        if (!grouped.has(key)) {
          grouped.set(key, {
            customer,
            serviceTypes: [booking.service_type],
            completedAt: booking.completed_at,
            bookingIds: [booking.id],
            daysSince: Math.floor((new Date().getTime() - new Date(booking.completed_at).getTime()) / (1000 * 60 * 60 * 24)),
          });
        } else {
          const existing = grouped.get(key);
          if (!existing.serviceTypes.includes(booking.service_type)) {
            existing.serviceTypes.push(booking.service_type);
          }
          existing.bookingIds.push(booking.id);
        }
      }

      return NextResponse.json({ reminders: Array.from(grouped.values()) });
    } else if (type === 'sent') {
      // Get sent reminders history
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          customer_id,
          service_type,
          completed_at,
          reminder_sent_at,
          customer:customers!inner (
            id,
            name,
            phone
          )
        `)
        .eq('status', 'complete')
        .not('reminder_sent_at', 'is', null)
        .order('reminder_sent_at', { ascending: false })
        .limit(100);

      if (error) {
        return NextResponse.json(
          { message: 'Database error', error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ reminders: data || [] });
    } else if (type === 'failed') {
      // Get failed reminders from message_logs
      const { data, error } = await supabase
        .from('message_logs')
        .select(`
          id,
          booking_id,
          customer_id,
          recipient_phone,
          error_message,
          created_at,
          customer:customers (
            id,
            name,
            phone
          ),
          booking:bookings (
            id,
            service_type,
            completed_at
          )
        `)
        .eq('message_type', 'reminder')
        .eq('success', false)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        return NextResponse.json(
          { message: 'Database error', error: error.message },
          { status: 500 }
        );
      }

      // Count consecutive failures per customer
      const failureCounts = new Map<string, number>();
      for (const log of data || []) {
        const customerId = log.customer_id;
        const count = failureCounts.get(customerId) || 0;
        failureCounts.set(customerId, count + 1);
      }

      const enriched = (data || []).map(log => ({
        ...log,
        failureCount: failureCounts.get(log.customer_id) || 1,
      }));

      return NextResponse.json({ reminders: enriched });
    } else if (type === 'stats') {
      // Get stats for current month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const { data: logs, error } = await supabase
        .from('message_logs')
        .select('success, estimated_cost')
        .eq('message_type', 'reminder')
        .gte('created_at', startOfMonth.toISOString());

      if (error) {
        return NextResponse.json(
          { message: 'Database error', error: error.message },
          { status: 500 }
        );
      }

      const total = logs?.length || 0;
      const successful = logs?.filter(l => l.success).length || 0;
      const failed = total - successful;
      const successRate = total > 0 ? (successful / total) * 100 : 0;
      const estimatedCost = logs?.reduce((sum, log) => sum + (log.estimated_cost || 0), 0) || 0;

      return NextResponse.json({
        totalSent: total,
        successful,
        failed,
        successRate: Math.round(successRate * 100) / 100,
        estimatedCost: Math.round(estimatedCost * 100) / 100,
      });
    }

    return NextResponse.json({ message: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Error fetching reminders:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
