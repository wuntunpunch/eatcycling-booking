'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useToast } from '@/components/toast';
import { setAuthCache, isAuthCacheValid } from '@/lib/auth-cache';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginMethod, setLoginMethod] = useState<'magic' | 'password'>('magic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [hasValidCache, setHasValidCache] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast, ToastComponent } = useToast();

  // Check for error in URL params
  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      showToast(error, 'error');
    }

    // Check if password fallback is enabled via URL parameter
    const fallback = searchParams.get('fallback');
    if (fallback === 'true') {
      setLoginMethod('password');
    }
  }, [searchParams, showToast]);

  // Handle auth email cookie from callback and sync cache
  useEffect(() => {
    // Check for email cookie from callback
    const authEmail = document.cookie
      .split('; ')
      .find(row => row.startsWith('eatcycling_auth_email='))
      ?.split('=')[1];

    if (authEmail) {
      setAuthCache(authEmail);
      // Clear the temporary cookie
      document.cookie = 'eatcycling_auth_email=; max-age=0; path=/';
    }

    // Sync cache cookie to localStorage
    const cookieCache = document.cookie
      .split('; ')
      .find(row => row.startsWith('eatcycling_auth_cache='))
      ?.split('=')[1];

    if (cookieCache) {
      try {
        const cache = JSON.parse(decodeURIComponent(cookieCache));
        setAuthCache(cache.email);
      } catch (error) {
        console.error('Failed to sync cache from cookie:', error);
      }
    }
  }, []);

  // Check for valid cache on mount
  useEffect(() => {
    setHasValidCache(isAuthCacheValid());
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/password-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: email.trim(),
          password: password.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.message || 'Invalid email or password', 'error');
        setIsSubmitting(false);
        return;
      }

      // Sync cache from cookie
      const authEmail = document.cookie
        .split('; ')
        .find(row => row.startsWith('eatcycling_auth_email='))
        ?.split('=')[1];

      if (authEmail) {
        setAuthCache(authEmail);
        document.cookie = 'eatcycling_auth_email=; max-age=0; path=/';
      }

      const cookieCache = document.cookie
        .split('; ')
        .find(row => row.startsWith('eatcycling_auth_cache='))
        ?.split('=')[1];

      if (cookieCache) {
        try {
          const cache = JSON.parse(decodeURIComponent(cookieCache));
          setAuthCache(cache.email);
        } catch (error) {
          console.error('Failed to sync cache from cookie:', error);
        }
      }

      showToast('Login successful!', 'success');
      router.push('/admin');
    } catch (error) {
      console.error('Password login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred. Please try again.';
      showToast(errorMessage, 'error');
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      let data: any = {};
      const contentType = response.headers.get('content-type');
      
      // Read response body once
      let responseText = '';
      try {
        responseText = await response.text();
      } catch (readError) {
        console.error('Failed to read response body:', readError);
        showToast('Server error: Could not read response', 'error');
        return;
      }
      
      // Parse JSON if content-type indicates JSON
      if (contentType && contentType.includes('application/json')) {
        if (responseText) {
          try {
            data = JSON.parse(responseText);
          } catch (jsonError) {
            console.error('Failed to parse JSON response:', jsonError, 'Response text:', responseText);
            showToast('Server error: Invalid JSON response', 'error');
            return;
          }
        } else {
          console.warn('Empty JSON response body');
          data = {};
        }
      } else {
        // Not JSON, show text response
        console.error('Non-JSON response:', responseText);
        showToast(`Server error: ${responseText || 'Invalid response format'}`, 'error');
        return;
      }

      if (!response.ok) {
        // Extract error message with proper fallback chain
        let errorMessage = data?.message;
        
        if (!errorMessage && data?.error) {
          if (typeof data.error === 'string') {
            errorMessage = data.error;
          } else if (typeof data.error === 'object' && data.error?.message) {
            errorMessage = data.error.message;
          }
        }
        
        // Final fallback
        if (!errorMessage) {
          errorMessage = `Failed to send magic link (${response.status} ${response.statusText})`;
        }
        
        // Log comprehensive error details (only in development)
        if (process.env.NODE_ENV === 'development') {
          console.error('=== LOGIN ERROR DETAILS ===');
          console.error('Status:', response.status);
          console.error('Status Text:', response.statusText);
          console.error('Content-Type:', contentType);
          console.error('Response Text:', responseText);
          console.error('Parsed Data:', data);
          console.error('==========================');
        }
        
        showToast(errorMessage, 'error');
        return;
      }

      setEmailSent(true);
      showToast('Magic link sent! Check your email.', 'success');
      setResendCooldown(60); // 60 second cooldown
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred. Please try again.';
      showToast(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = () => {
    if (resendCooldown > 0) return;
    handleSubmit(new Event('submit') as any);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      {ToastComponent}
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Logo/Branding */}
          <div className="flex justify-center mb-8">
            <Image
              src="/images/EAT.svg"
              alt="EAT Cycling"
              width={120}
              height={60}
              className="h-auto"
            />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Admin Login
          </h1>
          <p className="text-gray-600 text-center mb-6">
            {loginMethod === 'magic' 
              ? 'Enter your email to receive a magic link'
              : 'Enter your admin credentials'}
          </p>

          {/* Login method toggle - only show if password method is active or fallback param is present */}
          {(loginMethod === 'password' || searchParams.get('fallback') === 'true') && (
            <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setLoginMethod('magic');
                  setPassword('');
                  setEmailSent(false);
                }}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  loginMethod === 'magic'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Magic Link
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMethod('password');
                  setEmailSent(false);
                }}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  loginMethod === 'password'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Password
              </button>
            </div>
          )}

          {emailSent ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <p className="text-blue-800 text-sm">
                  Check your email for a magic link. Click the link to log in.
                </p>
              </div>

              <div className="text-center">
                <button
                  onClick={handleResend}
                  disabled={resendCooldown > 0}
                  className="text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed text-sm"
                >
                  {resendCooldown > 0
                    ? `Resend magic link (${resendCooldown}s)`
                    : 'Resend magic link'}
                </button>
              </div>

              <div className="pt-4 border-t">
                <button
                  onClick={() => {
                    setEmailSent(false);
                    setEmail('');
                  }}
                  className="w-full text-gray-600 hover:text-gray-800 text-sm"
                >
                  Use a different email
                </button>
              </div>
            </div>
          ) : loginMethod === 'password' ? (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                  className="w-full rounded-md border border-gray-300 px-4 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full rounded-md border border-gray-300 px-4 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled={isSubmitting}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !email.trim() || !password.trim()}
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Logging in...
                  </>
                ) : (
                  'Log in'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-md border border-gray-300 px-4 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled={isSubmitting}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !email.trim()}
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Sending...
                  </>
                ) : (
                  'Send magic link'
                )}
              </button>
            </form>
          )}

          {/* Fallback link - only show if valid cache exists */}
          {hasValidCache && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                Having trouble?{' '}
                <a
                  href="/admin/fallback"
                  className="text-blue-600 hover:text-blue-800"
                >
                  Try fallback access
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
