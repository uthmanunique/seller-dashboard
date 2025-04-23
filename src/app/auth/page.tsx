'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Cookies from 'js-cookie';
import Image from 'next/image';

// Export dynamic to ensure the page is not statically generated
export const dynamic = 'force-dynamic';

function AuthHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Processing authentication...');

  useEffect(() => {
    try {
      // Extract auth data from URL parameters
      const token = searchParams.get('token');
      const refreshToken = searchParams.get('refreshToken');
      const userDataStr = searchParams.get('userData');

      if (!token || !refreshToken || !userDataStr) {
        setStatus('Missing authentication data');
        return;
      }

      // Set cookies in the seller dashboard domain
      Cookies.set('accessToken', token, {
        expires: 1 / 24, // 1 hour
        secure: true,
        sameSite: 'lax',
      });

      Cookies.set('refreshToken', refreshToken, {
        expires: 1, // 1 day
        secure: true,
        sameSite: 'lax',
      });

      Cookies.set('sellerData', userDataStr, {
        expires: 1,
        secure: true,
        sameSite: 'lax',
      });

      Cookies.set('role', 'SELLER', {
        expires: 1,
        secure: true,
        sameSite: 'lax',
      });

      // Clean the URL (remove sensitive data from browser history)
      window.history.replaceState({}, document.title, '/dashboard');

      // Redirect to dashboard
      setStatus('Authentication successful! Redirecting...');
      setTimeout(() => router.push('/dashboard'), 1000);
    } catch (error) {
      console.error('Authentication error:', error);
      setStatus('Authentication failed. Please try logging in again.');
    }
  }, [router, searchParams]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md text-center">
        <Image src="/logo.png" alt="Rebrivo Logo" width={150} height={45} className="mx-auto mb-6" />
        <div className="animate-pulse mb-4">
          <div className="h-4 w-4 bg-[#F26E52] rounded-full mx-auto"></div>
        </div>
        <h2 className="text-xl font-semibold text-[#011631] mb-2">Authenticating...</h2>
        <p className="text-sm text-gray-600">{status}</p>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <Image src="/logo.png" alt="Rebrivo Logo" width={150} height={45} className="mx-auto mb-6" />
            <div className="animate-pulse mb-4">
              <div className="h-4 w-4 bg-[#F26E52] rounded-full mx-auto"></div>
            </div>
            <h2 className="text-xl font-semibold text-[#011631] mb-2">Loading...</h2>
            <p className="text-sm text-gray-600">Processing authentication...</p>
          </div>
        </div>
      }
    >
      <AuthHandler />
    </Suspense>
  );
}