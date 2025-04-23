// src/app/auth/page.tsx
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

function AuthHandler() {
  const router = useRouter();
  const [status, setStatus] = useState('Processing authentication...');

  useEffect(() => {
    try {
      // Check for required cookies
      const accessToken = Cookies.get('accessToken');
      const refreshToken = Cookies.get('refreshToken');
      const userDataStr = Cookies.get('sellerData');
      const role = Cookies.get('role');

      if (!accessToken || !refreshToken || !userDataStr || role !== 'SELLER') {
        setStatus('Missing authentication data. Redirecting to login...');
        setTimeout(() => {
          window.location.href = 'https://rebrivo-website.netlify.app/auth/login?role=seller';
        }, 1000);
        return;
      }

      // Cookies are already set by the login page, so no need to set them again
      // Clean the URL (remove any query parameters)
      window.history.replaceState({}, document.title, '/dashboard');

      // Redirect to dashboard
      setStatus('Authentication successful! Redirecting...');
      setTimeout(() => router.push('/dashboard'), 1000);
    } catch (error) {
      console.error('Authentication error:', error);
      setStatus('Authentication failed. Please try logging in again.');
      setTimeout(() => {
        window.location.href = 'https://rebrivo-website.netlify.app/auth/login?role=seller';
      }, 1000);
    }
  }, [router]);

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