import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Determine the base URL
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
      (process.env.NODE_ENV === 'production' 
        ? 'https://book.eatcycling.co.uk'
        : 'http://localhost:3000');

    // Send magic link
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${baseUrl}/api/auth/callback`,
      },
    });

    if (error) {
      console.error('Login error:', error);
      // Don't reveal if user exists or not for security
      return NextResponse.json(
        { message: 'Failed to send magic link. Please check your email or contact support.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: 'Magic link sent! Check your email.',
      success: true,
    });
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
