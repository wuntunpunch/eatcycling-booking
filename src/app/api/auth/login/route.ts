import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[${requestId}] Login request received`);
  
  try {
    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error(`[${requestId}] Missing NEXT_PUBLIC_SUPABASE_URL environment variable`);
      return NextResponse.json(
        { message: 'Server configuration error: Missing Supabase URL' },
        { status: 500 }
      );
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
      console.error(`[${requestId}] Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY environment variable`);
      return NextResponse.json(
        { message: 'Server configuration error: Missing Supabase key' },
        { status: 500 }
      );
    }

    // Parse request body
    let email: string;
    try {
      const body = await request.json();
      email = body.email;
      console.log(`[${requestId}] Parsed email:`, email ? 'present' : 'missing');
    } catch (parseError) {
      console.error(`[${requestId}] Failed to parse request body:`, parseError);
      return NextResponse.json(
        { message: 'Invalid request: Could not parse email' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string') {
      console.error(`[${requestId}] Email validation failed`);
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      );
    }

    // Create Supabase client
    let supabase;
    try {
      supabase = await createServerSupabaseClient();
      console.log(`[${requestId}] Supabase client created successfully`);
    } catch (clientError) {
      console.error(`[${requestId}] Failed to create Supabase client:`, clientError);
      return NextResponse.json(
        { message: 'Server error: Failed to initialize authentication service' },
        { status: 500 }
      );
    }

    // Determine the base URL - use the request origin to ensure correct URL
    const requestUrl = new URL(request.url);
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
      `${requestUrl.protocol}//${requestUrl.host}`;

    const redirectTo = `${baseUrl}/api/auth/callback`;
    console.log(`[${requestId}] Sending magic link to:`, email.trim().toLowerCase(), 'redirectTo:', redirectTo);

    // Send magic link
    const { data, error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      console.error(`[${requestId}] Supabase login error:`, {
        message: error.message,
        status: error.status,
        name: error.name,
        fullError: error
      });
      
      // Check for rate limit errors
      const isRateLimit = error.message?.toLowerCase().includes('rate limit') || 
                         error.message?.toLowerCase().includes('too many') ||
                         error.status === 429;
      
      let errorMessage: string;
      let statusCode = 400;
      
      if (isRateLimit) {
        errorMessage = 'Email rate limit exceeded (2 emails per hour). Please wait up to 1 hour before requesting another magic link, or use password login instead for immediate access.';
        statusCode = 429;
      } else {
        errorMessage = error.message || 'Failed to send magic link. Please check your email or contact support.';
      }
      
      const response = NextResponse.json(
        { 
          message: errorMessage,
          isRateLimit,
          error: process.env.NODE_ENV === 'development' ? {
            message: error.message,
            status: error.status,
            name: error.name
          } : undefined
        },
        { status: statusCode }
      );
      console.log(`[${requestId}] Returning error response:`, errorMessage);
      return response;
    }

    console.log(`[${requestId}] Magic link sent successfully to:`, email.trim().toLowerCase());

    const successResponse = NextResponse.json({
      message: 'Magic link sent! Check your email.',
      success: true,
    });
    console.log(`[${requestId}] Returning success response`);
    return successResponse;
  } catch (error) {
    console.error(`[${requestId}] Login API error:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    const response = NextResponse.json(
      { 
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? {
          message: errorMessage,
          stack: errorStack
        } : undefined
      },
      { status: 500 }
    );
    console.log(`[${requestId}] Returning catch error response:`, errorMessage);
    return response;
  }
}
