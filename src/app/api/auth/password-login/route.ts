import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Password-based authentication using Supabase
 * Uses Supabase's built-in email/password authentication
 * 
 * To create an admin account:
 * 1. Go to Supabase Dashboard > Authentication > Users
 * 2. Click "Add user" > "Create new user"
 * 3. Enter email and password
 * 4. Or use the Supabase SQL editor to create a user programmatically
 * 
 * This is the industry-standard approach - Supabase handles:
 * - Secure password hashing (bcrypt)
 * - Password reset flows
 * - Session management
 * - Rate limiting
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let email: string;
    let password: string;
    try {
      const body = await request.json();
      email = body.email;
      password = body.password;
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return NextResponse.json(
        { message: 'Invalid request: Could not parse credentials' },
        { status: 400 }
      );
    }

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = await createServerSupabaseClient();

    // Sign in with email and password using Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password.trim(),
    });

    if (error) {
      console.warn('Password login failed for:', email, error.message);
      return NextResponse.json(
        { message: error.message || 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (!data.user) {
      return NextResponse.json(
        { message: 'Authentication failed' },
        { status: 401 }
      );
    }

    console.log('Password login successful for:', data.user.email);

    // Create auth cache (same format as magic link for consistency)
    const cacheData = {
      email: data.user.email || email,
      timestamp: Date.now(),
    };

    // Set cookie for middleware to read (24 hours)
    const response = NextResponse.json({
      message: 'Login successful',
      success: true,
    });

    response.cookies.set('eatcycling_auth_cache', JSON.stringify(cacheData), {
      httpOnly: false, // Needs to be readable by client for localStorage sync
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });

    // Also set email cookie for client to read and sync to localStorage
    response.cookies.set('eatcycling_auth_email', data.user.email || email, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60, // Short-lived, just for initial cache setup
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Password login error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred. Please try again.';
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}
