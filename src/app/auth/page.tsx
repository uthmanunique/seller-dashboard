// src/app/auth/page.tsx
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

function AuthHandler() {
  const router = useRouter();
  const [status] = useState('Processing authentication...');

  useEffect(() => {
    // Since the POST is handled by the API route, this page can simply show a loading state
    // The API route will set cookies and redirect to /dashboard
    setTimeout(() => {
      router.push('/dashboard');
    }, 1000);
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