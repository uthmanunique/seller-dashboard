import axios, {
  AxiosError,
  AxiosResponse,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";
import Cookies from "js-cookie";
import { config, getLoginRedirectUrl } from "../config/env";

// Define a custom interface for Axios request config with _retry
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

interface FailedQueueItem {
  resolve: (value: string | null) => void;
  reject: (reason: AxiosError) => void;
}

// Create axios instance
const api = axios.create({
  baseURL: config.API_BASE_URL(),
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // Important for CORS with credentials
});

// Manage concurrent 401 handling
let isHandling401 = false;
let failedQueue: FailedQueueItem[] = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
};

// Get cookie domain based on environment
const getCookieDomain = () => {
  if (typeof window === 'undefined') return undefined;

  return window.location.hostname === 'localhost'
    ? undefined // No domain for localhost
    : window.location.hostname.includes('netlify.app')
      ? '.netlify.app' // For Netlify domains
      : undefined; // Default to current domain only
};

// Attach access token to every request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const accessToken = Cookies.get("accessToken");
  if (accessToken) {
    config.headers["Authorization"] = `Bearer ${accessToken}`;
  } else {
    console.log(`No access token for request: ${config.url}`);
  }
  return config;
});

// Handle all responses and errors
api.interceptors.response.use(
  (response) => {
    // Update tokens from headers for successful responses
    updateTokensFromHeaders(response);
    return response;
  },
  async (error: unknown) => {
    const axiosError = error as AxiosError;
    const originalRequest = axiosError.config as CustomAxiosRequestConfig | undefined;

    // Update tokens from headers for error responses
    if (axiosError.response) {
      updateTokensFromHeaders(axiosError.response);
    }

    // Handle 401 Unauthorized errors (token expired)
    if (axiosError.response?.status === 401 && !originalRequest?._retry) {
      if (originalRequest) {
        originalRequest._retry = true;
      }

      if (isHandling401) {
        // Queue the request while checking for new tokens
        return new Promise<string | null>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest && token) {
              originalRequest.headers["Authorization"] = `Bearer ${token}`;
              return api(originalRequest as AxiosRequestConfig);
            } else {
              return Promise.reject("Original request or token is undefined");
            }
          })
          .catch(() => Promise.reject());
      }

      isHandling401 = true;

      // Check if we have the necessary data
      const refreshToken = Cookies.get("refreshToken");
      const sellerDataStr = Cookies.get("sellerData");
      const role = Cookies.get("role");

      console.log("401 detected, checking auth:", {
        hasAccessToken: !!Cookies.get("accessToken"),
        hasRefreshToken: !!refreshToken,
        hasSellerData: !!sellerDataStr,
        role,
      });

      // Check if we have enough data to attempt token refresh
      if (!refreshToken || !sellerDataStr || role !== "SELLER") {
        console.warn("401: Missing refresh token or seller data, redirecting to login");
        isHandling401 = false;
        processQueue(axiosError);
        clearCookiesAndRedirect();
        return Promise.reject(axiosError);
      }

      try {
        // Attempt to refresh tokens using refresh token
        JSON.parse(sellerDataStr); // Validate JSON, but no need to store result
        const response = await axios.post(
          `${config.API_BASE_URL()}/auth/refresh-token`,
          { refreshToken },
          {
            headers: { "Content-Type": "application/json" },
          }
        );

        // Extract new tokens
        const newAccessToken = response.data.accessToken || response.headers["x-access-token"];
        const newRefreshToken = response.data.refreshToken || response.headers["x-refresh-token"];

        if (!newAccessToken) {
          throw new Error("No new access token received");
        }

        // Update cookies with new tokens
        const cookieDomain = getCookieDomain();
        const cookieSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';

        Cookies.set("accessToken", newAccessToken, {
          expires: 1 / 24, // 1 hour
          secure: cookieSecure,
          sameSite: "lax",
          path: "/",
          domain: cookieDomain,
        });

        if (newRefreshToken) {
          Cookies.set("refreshToken", newRefreshToken, {
            expires: 7, // 7 days
            secure: cookieSecure,
            sameSite: "lax",
            path: "/",
            domain: cookieDomain,
          });
        }

        // Update the original request with new token and retry
        if (originalRequest) {
          originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
        }

        processQueue(null, newAccessToken);
        isHandling401 = false;
        return api(originalRequest as AxiosRequestConfig);
      } catch (err) {
        console.error("Failed to refresh tokens:", err);
        processQueue(axiosError);
        isHandling401 = false;
        clearCookiesAndRedirect();
        return Promise.reject(axiosError);
      }
    }

    return Promise.reject(axiosError);
  }
);

// Helper to update tokens from response headers
const updateTokensFromHeaders = (response: AxiosResponse) => {
  const newAccessToken = response.headers["x-access-token"] as string | undefined;
  const newRefreshToken = response.headers["x-refresh-token"] as string | undefined;

  if (newAccessToken || newRefreshToken) {
    console.log("Updating tokens from headers:", {
      hasNewAccessToken: !!newAccessToken,
      hasNewRefreshToken: !!newRefreshToken,
    });
  }

  if (newAccessToken) {
    const cookieDomain = getCookieDomain();
    const cookieSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';

    Cookies.set("accessToken", newAccessToken, {
      expires: 1 / 24, // 1 hour
      secure: cookieSecure,
      sameSite: "lax",
      path: "/",
      domain: cookieDomain,
    });
  }

  if (newRefreshToken) {
    const cookieDomain = getCookieDomain();
    const cookieSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';

    Cookies.set("refreshToken", newRefreshToken, {
      expires: 7, // 7 days
      secure: cookieSecure,
      sameSite: "lax",
      path: "/",
      domain: cookieDomain,
    });
  }
};

// Helper to clear cookies and redirect
const clearCookiesAndRedirect = (error?: AxiosError) => {
  console.warn("Clearing cookies and redirecting to login", { error });

  const cookieDomain = getCookieDomain();
  const removeOptions = { path: "/" };
  const domainOptions = cookieDomain ? { ...removeOptions, domain: cookieDomain } : removeOptions;

  // Remove cookies for both current domain and shared domain
  ["accessToken", "refreshToken", "sellerData", "role"].forEach((cookie) => {
    Cookies.remove(cookie, removeOptions);
    if (cookieDomain) {
      Cookies.remove(cookie, domainOptions);
    }
  });

  const timestamp = new Date().getTime();
  window.location.href = `${getLoginRedirectUrl("seller")}?t=${timestamp}`;
};

// Check auth on initial load
export const validateAuth = () => {
  const accessToken = Cookies.get("accessToken");
  const sellerData = Cookies.get("sellerData");
  const role = Cookies.get("role");

  console.log("Validating auth:", {
    hasAccessToken: !!accessToken,
    hasSellerData: !!sellerData,
    role,
    accessTokenValue: accessToken,
    sellerDataValue: sellerData ? JSON.parse(sellerData) : null,
  });

  try {
    if (sellerData) {
      JSON.parse(sellerData);
    }
  } catch {
    console.warn("validateAuth: Invalid sellerData JSON");
    clearCookiesAndRedirect();
    return false;
  }

  if (!accessToken || !sellerData || role !== "SELLER") {
    console.warn("validateAuth: No valid auth found", { accessToken, sellerData, role });
    clearCookiesAndRedirect();
    return false;
  }
  return true;
};

// Function to proactively refresh tokens
export const setupTokenRefresh = () => {
  const refreshInterval = 5 * 60 * 1000; // 5 minutes

  const refreshTokens = async () => {
    const refreshToken = Cookies.get("refreshToken");
    if (!refreshToken) {
      console.warn("Token refresh: Missing refresh token");
      return;
    }

    try {
      const response = await axios.post(
        `${config.API_BASE_URL()}/auth/refresh-token`,
        { refreshToken },
        { headers: { "Content-Type": "application/json" } }
      );

      const newAccessToken = response.data.accessToken || response.headers["x-access-token"];
      const newRefreshToken = response.data.refreshToken || response.headers["x-refresh-token"];

      if (!newAccessToken) {
        throw new Error("No new access token received");
      }

      const cookieDomain = getCookieDomain();
      const cookieSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';

      Cookies.set("accessToken", newAccessToken, {
        expires: 1 / 24, // 1 hour
        secure: cookieSecure,
        sameSite: "lax",
        path: "/",
        domain: cookieDomain,
      });

      if (newRefreshToken) {
        Cookies.set("refreshToken", newRefreshToken, {
          expires: 7, // 7 days
          secure: cookieSecure,
          sameSite: "lax",
          path: "/",
          domain: cookieDomain,
        });
      }

      console.log("Token refreshed successfully");
    } catch {
      console.error("Failed to refresh tokens");
      // Don’t clear cookies here; let 401 handler deal with it
    }
  };

  const intervalId = setInterval(refreshTokens, refreshInterval);
  return () => clearInterval(intervalId);
};

export default api;




// // src/lib/api.ts
// import axios from 'axios';
// import Cookies from 'js-cookie';
// import { config, getLoginRedirectUrl } from '../config/env';

// // Create axios instance
// const api = axios.create({
//   baseURL: config.API_BASE_URL(),
//   headers: { 'Content-Type': 'application/json' },
// });

// // Manage concurrent 401 handling
// let isHandling401 = false;
// let failedQueue: Array<{ resolve: (value: any) => void; reject: (reason: any) => void }> = [];

// const processQueue = (error: any, token: string | null = null) => {
//   failedQueue.forEach(({ resolve, reject }) => {
//     if (error) {
//       reject(error);
//     } else {
//       resolve(token);
//     }
//   });
//   failedQueue = [];
// };

// // Attach access token to every request
// api.interceptors.request.use((config) => {
//   const accessToken = Cookies.get('accessToken');
//   if (accessToken) {
//     config.headers['Authorization'] = `Bearer ${accessToken}`;
//   } else {
//     console.log(`No access token for request: ${config.url}`);
//   }
//   return config;
// });

// // Handle all responses and errors
// api.interceptors.response.use(
//   (response) => {
//     // Update tokens from headers for successful responses
//     updateTokensFromHeaders(response);
//     return response;
//   },
//   async (error) => {
//     const originalRequest = error.config;

//     // Update tokens from headers for error responses
//     if (error.response) {
//       updateTokensFromHeaders(error.response);
//     } else {
//       console.error(`No response object for error: ${error.message}`);
//     }

//     if (error.response?.status === 401 && !originalRequest._retry) {
//       originalRequest._retry = true;

//       if (isHandling401) {
//         // Queue the request
//         return new Promise((resolve, reject) => {
//           failedQueue.push({ resolve, reject });
//         })
//           .then((token) => {
//             originalRequest.headers['Authorization'] = `Bearer ${token}`;
//             return api(originalRequest);
//           })
//           .catch((err) => Promise.reject(err));
//       }

//       isHandling401 = true;

//       const accessToken = Cookies.get('accessToken');
//       const refreshToken = Cookies.get('refreshToken');

//       if (!accessToken || !refreshToken) {
//         console.warn(`401: Missing tokens, redirecting to login. URL: ${originalRequest.url}`);
//         isHandling401 = false;
//         clearCookiesAndRedirect();
//         return Promise.reject(error);
//       }

//       // Check if new tokens were updated from headers
//       const newAccessToken = Cookies.get('accessToken');
//       if (newAccessToken && newAccessToken !== accessToken) {
//         console.log(`401: New access token found, retrying request: ${originalRequest.url}`);
//         originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
//         processQueue(null, newAccessToken);
//         isHandling401 = false;
//         return api(originalRequest);
//       }

//       // No new tokens, redirect to login
//       console.warn(`401: No new tokens in response, redirecting to login. URL: ${originalRequest.url}`);
//       isHandling401 = false;
//       processQueue(error);
//       clearCookiesAndRedirect();
//       return Promise.reject(error);
//     }

//     console.error(`API error: ${error.response?.status || 'No status'} - ${error.message}`);
//     return Promise.reject(error);
//   }
// );

// // Helper to update tokens from response headers
// const updateTokensFromHeaders = (response: any) => {
//   const newAccessToken = response.headers['x-access-token'];
//   const newRefreshToken = response.headers['x-refresh-token'];

//   console.log(`Checking headers for: ${response.config?.url || 'unknown'}`);
//   console.log(`Headers - x-access-token: ${!!newAccessToken}, x-refresh-token: ${!!newRefreshToken}`);

//   if (newAccessToken) {
//     Cookies.set('accessToken', newAccessToken, {
//       expires: 15 / (24 * 60), // 15 minutes
//       secure: process.env.NODE_ENV === 'production',
//       sameSite: 'strict',
//     });
//     console.log(`Updated accessToken for: ${response.config?.url || 'unknown'}`);
//   }

//   if (newRefreshToken) {
//     Cookies.set('refreshToken', newRefreshToken, {
//       expires: 1, // 1 day
//       secure: process.env.NODE_ENV === 'production',
//       sameSite: 'strict',
//     });
//     console.log(`Updated refreshToken for: ${response.config?.url || 'unknown'}`);
//   }

//   if (!newAccessToken && !newRefreshToken) {
//     console.log(`No token headers in response: ${response.config?.url || 'unknown'}`);
//   }
// };

// // Helper to clear cookies and redirect
// const clearCookiesAndRedirect = () => {
//   console.log('Clearing cookies and redirecting to login');
//   Cookies.remove('accessToken');
//   Cookies.remove('refreshToken');
//   Cookies.remove('sellerData');
//   window.location.href = getLoginRedirectUrl('seller');
// };

// // Proactive token refresh
// export const setupTokenRefresh = () => {
//   const refreshInterval = 10 * 60 * 1000; // Every 10 minutes
//   setInterval(async () => {
//     const accessToken = Cookies.get('accessToken');
//     const refreshToken = Cookies.get('refreshToken');
//     const sellerData = Cookies.get('sellerData');
//     console.log('Attempting proactive token refresh');
//     if (accessToken && refreshToken && sellerData) {
//       try {
//         const userId = JSON.parse(sellerData).id;
//         console.log(`Proactive refresh: Fetching /wallets/fetch-info for userId: ${userId}`);
//         await api.get('/wallets/fetch-info', {
//           params: {
//             userType: 'SELLER',
//             userId,
//           },
//         });
//         console.log('Proactive refresh successful');
//       } catch (err: any) {
//         console.error(`Proactive refresh failed: ${err.message}`, {
//           status: err.response?.status,
//           url: err.config?.url,
//         });
//       }
//     } else {
//       console.warn('Proactive refresh skipped: Missing tokens or seller data');
//     }
//   }, refreshInterval);
// };

// export default api;