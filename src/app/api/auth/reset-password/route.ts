import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Handle password reset
 * Exchanges the recovery code for a session and updates the password
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, password } = body;

    if (!code || !password) {
      return NextResponse.json(
        { message: 'Code and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Exchange the recovery code for a session
    const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('Password reset exchange error:', exchangeError);
      return NextResponse.json(
        { message: exchangeError.message || 'Invalid or expired reset link. Please request a new one.' },
        { status: 400 }
      );
    }

    if (!sessionData.user) {
      return NextResponse.json(
        { message: 'Failed to verify reset link' },
        { status: 400 }
      );
    }

    // Update the password
    const { error: updateError } = await supabase.auth.updateUser({
      password: password.trim(),
    });

    if (updateError) {
      console.error('Password update error:', updateError);
      return NextResponse.json(
        { message: updateError.message || 'Failed to update password. Please try again.' },
        { status: 400 }
      );
    }

    console.log('Password reset successful for user:', sessionData.user.email);

    return NextResponse.json({
      message: 'Password reset successful',
      success: true,
    });
  } catch (error) {
    console.error('Password reset error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred. Please try again.';
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}
