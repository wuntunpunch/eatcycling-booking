import { NextRequest, NextResponse } from 'next/server';

/**
 * Root-level auth handler to catch Supabase redirects that might go to /api/auth
 * Redirects to the proper callback handler
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');

  // If there's a code or error, redirect to the callback handler
  if (code || error) {
    return NextResponse.redirect(
      new URL(`/api/auth/callback?${requestUrl.searchParams.toString()}`, request.url)
    );
  }

  // Otherwise, redirect to login
  return NextResponse.redirect(new URL('/admin/login', request.url));
}
