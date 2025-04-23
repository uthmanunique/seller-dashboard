// src/app/auth/page.tsx
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Cookies from 'js-cookie';
import Image from 'next/image';
import axios from 'axios';
import { config } from '../../config/env';

// Export dynamic to ensure the page is not statically generated
export const dynamic = 'force-dynamic';

function AuthHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Processing authentication...');

  useEffect(() => {
    const authenticate = async () => {
      try {
        // Get code (accessToken) from URL
        const code = searchParams.get('code');

        if (!code) {
          setStatus('Missing authentication code');
          setTimeout(() => {
            window.location.href = 'https://rebrivo-website.netlify.app/auth/login?role=seller';
          }, 1000);
          return;
        }

        // Use the accessToken to fetch seller data
        const response = await axios.get(`${config.API_BASE_URL()}/wallets/fetch-info`, {
          headers: {
            'Authorization': `Bearer ${code}`,
            'Content-Type': 'application/json',
          },
          params: {
            userType: 'SELLER',
          },
        });

        const { user } = response.data;
        const sellerData = user || response.data; // Adjust based on actual response structure

        if (!sellerData) {
          throw new Error('Invalid seller data');
        }

        // Extract tokens from headers
        const accessToken = response.headers['x-access-token'] || code;
        const refreshToken = response.headers['x-refresh-token'];

        if (!accessToken || !refreshToken) {
          throw new Error('Missing tokens in response headers');
        }

        // Set cookies on the dashboard domain
        Cookies.set('accessToken', accessToken, {
          expires: 1 / 24, // 1 hour
          secure: true,
          sameSite: 'lax',
          path: '/',
        });
        Cookies.set('refreshToken', refreshToken, {
          expires: 1, // 1 day
          secure: true,
          sameSite: 'lax',
          path: '/',
        });
        Cookies.set('sellerData', JSON.stringify(sellerData), {
          expires: 1,
          secure: true,
          sameSite: 'lax',
          path: '/',
        });
        Cookies.set('role', 'SELLER', {
          expires: 1,
          secure: true,
          sameSite: 'lax',
          path: '/',
        });

        // Clean the URL
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
    };

    authenticate();
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