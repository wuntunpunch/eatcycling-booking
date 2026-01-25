import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone } = body;

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json(
        { message: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Normalize phone number (same logic as booking form)
    const normalizedPhone = phone.replace(/[\s-]/g, '');

    const supabase = getSupabaseClient();

    // Find customer by phone
    const { data: customer, error: findError } = await supabase
      .from('customers')
      .select('id, phone')
      .eq('phone', normalizedPhone)
      .single();

    if (findError || !customer) {
      // Still return success to prevent phone number enumeration
      return NextResponse.json({
        success: true,
        message: 'Opt-out processed',
      });
    }

    // Update opt_out_reminders flag
    const { error: updateError } = await supabase
      .from('customers')
      .update({ opt_out_reminders: true })
      .eq('id', customer.id);

    if (updateError) {
      console.error('Error updating opt-out:', updateError);
      return NextResponse.json(
        { message: 'Failed to process opt-out' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully opted out',
    });
  } catch (error) {
    console.error('Opt-out error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
