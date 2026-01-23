import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  console.log('Auth callback received:', { 
    code: code ? 'present' : 'missing', 
    error, 
    errorDescription,
    url: requestUrl.toString() 
  });

  // Handle errors
  if (error || !code) {
    const errorMessage = errorDescription || error || 'Magic link expired or invalid. Please request a new one.';
    console.error('Auth callback error:', { error, errorDescription });
    return NextResponse.redirect(
      new URL(`/admin/login?error=${encodeURIComponent(errorMessage)}`, request.url)
    );
  }

  try {
    const supabase = await createServerSupabaseClient();

    // Exchange code for session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('Session exchange error:', exchangeError);
      return NextResponse.redirect(
        new URL(`/admin/login?error=${encodeURIComponent(exchangeError.message || 'Failed to create session. Please try again.')}`, request.url)
      );
    }

    if (!data.user) {
      console.error('No user data after session exchange');
      return NextResponse.redirect(
        new URL(`/admin/login?error=${encodeURIComponent('Failed to create session. Please try again.')}`, request.url)
      );
    }

    console.log('Auth successful for user:', data.user.email);

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
      path: '/',
    });

    // Also set email cookie for client to read and sync to localStorage
    response.cookies.set('eatcycling_auth_email', email, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60, // Short-lived, just for initial cache setup
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred. Please try again.';
    return NextResponse.redirect(
      new URL(`/admin/login?error=${encodeURIComponent(errorMessage)}`, request.url)
    );
  }
}
