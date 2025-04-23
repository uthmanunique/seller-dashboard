"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Cookies from "js-cookie";
import Image from "next/image";
import axios from "axios";
import { config } from "../../config/env";

// Export dynamic to ensure the page is not statically generated
export const dynamic = "force-dynamic";

function AuthHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Processing authentication...");

  const authenticate = useCallback(async () => {
    try {
      const code = searchParams.get("code");
      if (!code) {
        setStatus("Missing authentication code");
        setTimeout(() => {
          window.location.href = "https://rebrivo-website.netlify.app/auth/login?role=seller";
        }, 1000);
        return;
      }

      const response = await axios.get(`${config.API_BASE_URL()}/wallets/fetch-info`, {
        headers: {
          Authorization: `Bearer ${code}`,
          "Content-Type": "application/json",
        },
        params: { userType: "SELLER" },
      });

      const { user } = response.data;
      const sellerData = user || response.data;
      if (!sellerData) {
        throw new Error("Invalid seller data");
      }

      const accessToken = response.headers["x-access-token"] || code;
      const refreshToken = response.headers["x-refresh-token"];

      const cookieDomain = window.location.hostname.includes('localhost')
        ? undefined
        : '.netlify.app';
      const cookieSecure = window.location.protocol === 'https:';

      console.log("Setting cookies with domain:", cookieDomain);

      const cookieOptions = {
        path: "/",
        secure: cookieSecure,
        sameSite: "lax" as const,
        domain: cookieDomain,
      };

      Cookies.set("accessToken", accessToken, {
        ...cookieOptions,
        expires: 1 / 24, // 1 hour
      });

      if (refreshToken) {
        Cookies.set("refreshToken", refreshToken, {
          ...cookieOptions,
          expires: 7, // 7 days
        });
      }

      Cookies.set("sellerData", JSON.stringify(sellerData), {
        ...cookieOptions,
        expires: 1,
      });

      Cookies.set("role", "SELLER", {
        ...cookieOptions,
        expires: 1,
      });

      // Verify cookies were set properly with delay to ensure they're saved
      setTimeout(() => {
        const verifyAccessToken = Cookies.get("accessToken");
        const verifyRole = Cookies.get("role");
        const verifySellerData = Cookies.get("sellerData");

        console.log("Verifying cookies:", {
          accessToken: !!verifyAccessToken,
          role: verifyRole,
          hasSellerData: !!verifySellerData,
        });

        if (!verifyAccessToken || verifyRole !== "SELLER" || !verifySellerData) {
          console.error("Failed to set cookies properly");
          setStatus("Authentication error: Failed to set cookies");
          return;
        }

        // Clean the URL to prevent token exposure
        window.history.replaceState({}, document.title, "/dashboard");

        // Wait a bit longer to ensure cookies are fully processed
        setStatus("Authentication successful! Redirecting...");
        setTimeout(() => router.push("/dashboard"), 500);
      }, 500);
    } catch (error) {
      console.error("Authentication error:", error);
      setStatus("Authentication failed. Please try logging in again.");

      const cookieDomain = window.location.hostname.includes('netlify.app') ? '.netlify.app' : undefined;
      ['accessToken', 'refreshToken', 'sellerData', 'role'].forEach(cookie => {
        Cookies.remove(cookie, { path: "/" });
        if (cookieDomain) {
          Cookies.remove(cookie, { path: "/", domain: cookieDomain });
        }
      });

      setTimeout(() => {
        window.location.href = "https://rebrivo-website.netlify.app/auth/login?role=seller";
      }, 1000);
    }
  }, [router, searchParams]); // Dependencies for useCallback

  useEffect(() => {
    authenticate();
  }, [authenticate]); // Add authenticate to dependency array

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