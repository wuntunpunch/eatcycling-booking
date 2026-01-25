'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useToast } from '@/components/toast';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast, ToastComponent } = useToast();

  // Check for code in URL params
  const code = searchParams.get('code');

  useEffect(() => {
    if (!code) {
      showToast('Invalid or missing reset link. Please request a new password reset.', 'error');
      router.push('/admin/login');
    }
  }, [code, router, showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code) {
      showToast('Invalid reset link', 'error');
      return;
    }

    if (!password.trim() || !confirmPassword.trim()) {
      showToast('Please enter both password fields', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    if (password.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      // Exchange the code for a session and update password
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          password: password.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.message || 'Failed to reset password. The link may have expired.', 'error');
        setIsSubmitting(false);
        return;
      }

      showToast('Password reset successful! Redirecting to login...', 'success');
      setTimeout(() => {
        router.push('/admin/login');
      }, 2000);
    } catch (error) {
      console.error('Password reset error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred. Please try again.';
      showToast(errorMessage, 'error');
      setIsSubmitting(false);
    }
  };

  if (!code) {
    return null; // Will redirect in useEffect
  }

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
            Reset Password
          </h1>
          <p className="text-gray-600 text-center mb-6">
            Enter your new password below
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                required
                minLength={6}
                className="w-full rounded-md border border-gray-300 px-4 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                minLength={6}
                className="w-full rounded-md border border-gray-300 px-4 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={isSubmitting}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !password.trim() || !confirmPassword.trim()}
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
                  Resetting password...
                </>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              <a
                href="/admin/login"
                className="text-blue-600 hover:text-blue-800"
              >
                Back to login
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
