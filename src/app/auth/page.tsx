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
      console.log("Starting authentication process..."); // Debugging log
  
      const stateStr = sessionStorage.getItem("authData");
      console.log("Retrieved authData from sessionStorage:", stateStr); // Debugging log
  
      if (!stateStr) {
        setStatus("Missing authentication data");
        console.log("Authentication failed: authData not found."); // Debugging log
        return;
      }
  
      // Parse the authentication data
      let state;
      try {
        state = JSON.parse(stateStr);
      } catch (error) {
        console.error("Error parsing authData:", error);
        setStatus("Invalid authentication data format.");
        return;
      }
  
      const { token, refreshToken, userData } = state;
  
      if (!token || !refreshToken || !userData) {
        setStatus("Invalid authentication data");
        console.log("Invalid authentication details found:", state); // Debugging log
        return;
      }
  
      const role = userData.role || "SELLER"; // Default role to SELLER if not provided
  
      console.log(`User Role Identified: ${role}`); // Debugging log
  
      // Store tokens in cookies
      Cookies.set("accessToken", token, { expires: 1 / 24, secure: true, sameSite: "lax" });
      Cookies.set("refreshToken", refreshToken, { expires: 1, secure: true, sameSite: "lax" });
  
      if (role === "BUYER") {
        Cookies.set("buyerData", JSON.stringify(userData), { expires: 1, secure: true, sameSite: "lax" });
      } else {
        Cookies.set("sellerData", JSON.stringify(userData), { expires: 1, secure: true, sameSite: "lax" });
      }
  
      Cookies.set("role", role, { expires: 1, secure: true, sameSite: "lax" });
  
      console.log("Cookies set successfully:", Cookies.get()); // Debugging log
  
      setStatus("Authentication successful! Redirecting...");
  
      setTimeout(() => {
        console.log("Navigating to /dashboard..."); // Debugging log
        router.push("/dashboard");
      }, 1000);
  
      // Clean up sessionStorage after redirect
      setTimeout(() => {
        sessionStorage.removeItem("authData");
        console.log("Session storage cleared after authentication."); // Debugging log
      }, 3000);
  
    } catch (error) {
      console.error("Authentication error:", error);
      setStatus("Authentication failed. Please try logging in again.");
    }
  }, [router]);
  // Remove searchParams dependency

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