import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Check if this is an admin route (excluding login and fallback)
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin') && 
    !request.nextUrl.pathname.startsWith('/admin/login') &&
    !request.nextUrl.pathname.startsWith('/admin/fallback');
  const isAdminApiRoute = request.nextUrl.pathname.startsWith('/api/admin');

  if (!isAdminRoute && !isAdminApiRoute) {
    // Not an admin route, allow through
    return response;
  }

  // Try Supabase authentication first
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (user && !authError) {
      // User is authenticated via Supabase, allow access
      return response;
    }
  } catch (error) {
    // Supabase/auth is unavailable - check for fallback cache
    console.log('Supabase auth check failed, checking fallback cache');
  }

  // Supabase auth failed - check for localStorage cache fallback
  // Note: localStorage is not accessible in middleware, so we check via cookie
  // The client will set a cookie with the cache info if available
  const cacheCookie = request.cookies.get('eatcycling_auth_cache');
  
  if (cacheCookie) {
    try {
      const cache = JSON.parse(cacheCookie.value);
      const age = Date.now() - cache.timestamp;
      const isValid = age < 24 * 60 * 60 * 1000; // 24 hours

      if (isValid && cache.email) {
        // Valid cache exists - allow access (fallback mode)
        // Pages will show warning banner if needed
        return response;
      }
    } catch (error) {
      console.error('Failed to parse cache cookie:', error);
    }
  }

  // No valid authentication - redirect to login
  if (isAdminRoute) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  // For API routes, return 401 (route handlers will check cache)
  return NextResponse.json(
    { message: 'Unauthorized' },
    { status: 401 }
  );
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
  ],
};
