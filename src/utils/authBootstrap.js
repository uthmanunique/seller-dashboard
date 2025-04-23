/**
 * Auth bootstrap script to be imported in your main app component
 * This ensures proper initialization of authentication
 */
import Cookies from "js-cookie";
import { setupTokenRefresh } from '../lib/api'

let authInitialized = false;

export const initializeAuth = () => {
  if (authInitialized) return;
  
  console.log("Initializing auth system...");
  
  // Check for cookies on load
  const accessToken = Cookies.get("accessToken");
  const sellerData = Cookies.get("sellerData");
  const role = Cookies.get("role");
  
  console.log("Initial auth check:", { 
    hasAccessToken: !!accessToken,
    hasSellerData: !!sellerData,
    role
  });
  
  // Only setup token refresh if we have valid auth data
  if (accessToken && sellerData && role === "SELLER") {
    console.log("Setting up token refresh");
    setupTokenRefresh();
  } else {
    console.warn("Missing auth data on initial load");
    // Don't redirect immediately - wait for potential auth completion
    setTimeout(() => {
      // Check again after a short delay
      const accessTokenRetry = Cookies.get("accessToken");
      if (!accessTokenRetry) {
        console.warn("Still missing auth data after delay, redirecting");
        // Only clear and redirect if we're on a protected page
        if (!window.location.pathname.includes('/auth')) {
          // Get login URL from your config
          const loginUrl = "https://rebrivo-website.netlify.app/auth/login?role=seller";
          window.location.href = `${loginUrl}?t=${new Date().getTime()}`;
        }
      }
    }, 1000);
  }
  
  authInitialized = true;
};
