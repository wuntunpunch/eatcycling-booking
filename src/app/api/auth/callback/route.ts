import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // Handle errors
  if (error || !code) {
    const errorMessage = errorDescription || 'Magic link expired or invalid. Please request a new one.';
    return NextResponse.redirect(
      new URL(`/admin/login?error=${encodeURIComponent(errorMessage)}`, request.url)
    );
  }

  try {
    const supabase = await createServerSupabaseClient();

    // Exchange code for session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError || !data.user) {
      console.error('Session exchange error:', exchangeError);
      return NextResponse.redirect(
        new URL(`/admin/login?error=${encodeURIComponent('Failed to create session. Please try again.')}`, request.url)
      );
    }

    // Cache auth state - set cookie for middleware and client
    const response = NextResponse.redirect(new URL('/admin', request.url));
    
    const email = data.user.email || '';
    const cacheData = {
      email,
      timestamp: Date.now(),
    };

    // Set cookie for middleware to read (24 hours)
    response.cookies.set('eatcycling_auth_cache', JSON.stringify(cacheData), {
      httpOnly: false, // Needs to be readable by client for localStorage sync
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
    });

    // Also set email cookie for client to read and sync to localStorage
    response.cookies.set('eatcycling_auth_email', email, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60, // Short-lived, just for initial cache setup
    });

    return response;
  } catch (error) {
    console.error('Callback error:', error);
    return NextResponse.redirect(
      new URL(`/admin/login?error=${encodeURIComponent('An error occurred. Please try again.')}`, request.url)
    );
  }
}
