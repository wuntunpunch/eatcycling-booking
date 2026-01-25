import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Request password reset
 * Sends a password reset email to the user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Determine the base URL for the reset link
    const requestUrl = new URL(request.url);
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
      `${requestUrl.protocol}//${requestUrl.host}`;

    const redirectTo = `${baseUrl}/api/auth/callback`;

    // Send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo,
    });

    if (error) {
      console.error('Password reset request error:', error);
      
      // Check for rate limit errors - we should inform user about this
      const isRateLimit = error.message?.toLowerCase().includes('rate limit') || 
                         error.message?.toLowerCase().includes('too many') ||
                         error.status === 429;
      
      if (isRateLimit) {
        // For rate limits, we can be more specific since it's not about email existence
        return NextResponse.json(
          { 
            message: 'Email rate limit exceeded (2 emails per hour). Please wait up to 1 hour before requesting another password reset link.',
            isRateLimit: true
          },
          { status: 429 }
        );
      }
      
      // For other errors, don't reveal if email exists or not for security
      return NextResponse.json(
        { message: 'If an account exists with this email, a password reset link has been sent.' },
        { status: 200 } // Return 200 even on error to prevent email enumeration
      );
    }

    console.log('Password reset email sent to:', email.trim().toLowerCase());

    // Always return success message to prevent email enumeration
    return NextResponse.json({
      message: 'If an account exists with this email, a password reset link has been sent.',
      success: true,
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    // Always return success message to prevent email enumeration
    return NextResponse.json({
      message: 'If an account exists with this email, a password reset link has been sent.',
      success: true,
    });
  }
}
