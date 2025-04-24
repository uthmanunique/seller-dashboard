'use client'; // This must be the first line in the file

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import Image from 'next/image';

// Export dynamic to ensure the page is not statically generated
export const dynamic = 'force-dynamic';

function AuthHandler() {
  const router = useRouter();
  const [status, setStatus] = useState('Processing authentication...');

  useEffect(() => {
    try {
      // Get the hash fragment (without the # symbol)
      const hashFragment = window.location.hash.substring(1);
      
      if (!hashFragment) {
        setStatus('Missing authentication data');
        return;
      }
      
      // Decode the token from hash fragment
      const stateStr = atob(hashFragment);
      const state = JSON.parse(stateStr);
      
      const token = state.token;
      const refreshToken = state.refreshToken;
      const userData = state.userData;
      
      if (!token || !refreshToken || !userData) {
        setStatus('Invalid authentication data');
        return;
      }
  
      // Determine role from userData or URL
      const role = userData.role || 'SELLER'; // Default to SELLER if not specified
  
      // Set cookies in the dashboard domain
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
  
      // Set role-specific data
      if (role === 'BUYER') {
        Cookies.set('buyerData', JSON.stringify(userData), {
          expires: 1,
          secure: true,
          sameSite: 'lax',
        });
      } else {
        Cookies.set('sellerData', JSON.stringify(userData), {
          expires: 1,
          secure: true,
          sameSite: 'lax',
        });
      }
  
      Cookies.set('role', role, {
        expires: 1,
        secure: true,
        sameSite: 'lax',
      });
  
      // Clean the URL (remove sensitive data from browser history)
      window.history.replaceState({}, document.title, '/auth');
  
      // Redirect to dashboard
      setStatus('Authentication successful! Redirecting...');
      setTimeout(() => router.push('/dashboard'), 1000);
    } catch (error) {
      console.error('Authentication error:', error);
      setStatus('Authentication failed. Please try logging in again.');
    }
  }, [router]); // Remove searchParams dependency

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <div className="flex flex-col items-center justify-center">
          <Image 
            src="/logo.png" 
            alt="Logo" 
            width={120} 
            height={120} 
            className="mb-6"
          />
          <h1 className="mb-4 text-2xl font-bold text-[#011631]">
            Authenticating...
          </h1>
          <p className="text-center text-gray-600">
            {status}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return <AuthHandler />;
}