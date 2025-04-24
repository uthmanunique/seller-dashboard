import axios from 'axios';
import Cookies from 'js-cookie';
import { config, getLoginRedirectUrl } from '../config/env';

interface Credentials {
  email: string;
  password: string;
}

// Create Axios instance
const api = axios.create({
  baseURL: config.API_BASE_URL(),
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // For CORS with credentials
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const accessToken = Cookies.get('accessToken');
  if (accessToken) {
    config.headers['Authorization'] = `Bearer ${accessToken}`;
  } else {
    console.log(`No access token for request: ${config.url}`);
  }
  return config;
});

// Update tokens from response headers for successful responses
api.interceptors.response.use(
  (response) => {
    const newAccessToken = response.headers['x-access-token'] || response.data?.accessToken;
    const newRefreshToken = response.headers['x-refresh-token'] || response.data?.refreshToken;

    if (newAccessToken) {
      Cookies.set('accessToken', newAccessToken, {
        expires: 1 / 24, // 1 hour
        secure: true,
        sameSite: 'lax',
      });
    }
    if (newRefreshToken) {
      Cookies.set('refreshToken', newRefreshToken, {
        expires: 7, // 7 days
        secure: true,
        sameSite: 'lax',
      });
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      console.warn('401 Unauthorized - Waiting for next successful response to update tokens');
      // Do not log out; wait for token update
    }
    return Promise.reject(error);
  }
);

// Handle login and store initial tokens from response body
export const handleLogin = async (credentials: Credentials) => {
  try {
    const response = await api.post('/auth/login', credentials);
    const { accessToken, refreshToken, seller } = response.data;

    if (accessToken && refreshToken) {
      Cookies.set('accessToken', accessToken, {
        expires: 1 / 24, // 1 hour
        secure: true,
        sameSite: 'lax',
      });
      Cookies.set('refreshToken', refreshToken, {
        expires: 7, // 7 days
        secure: true,
        sameSite: 'lax',
      });
      Cookies.set('sellerData', JSON.stringify(seller), {
        expires: 7,
        secure: true,
        sameSite: 'lax',
      });
    }
    return response;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

// Check if we have valid auth data
const hasValidAuth = () => {
  const accessToken = Cookies.get('accessToken');
  const sellerData = Cookies.get('sellerData');
  return !!accessToken && !!sellerData;
};

// Helper to clear cookies and redirect (only use when explicitly needed, not on 401)
const clearCookiesAndRedirect = () => {
  console.log('Clearing cookies and redirecting to login');
  Cookies.remove('accessToken');
  Cookies.remove('refreshToken');
  Cookies.remove('sellerData');
  const timestamp = new Date().getTime();
  window.location.href = `${getLoginRedirectUrl('seller')}?t=${timestamp}`;
};

// Validate auth on initial load
export const validateAuth = () => {
  if (!hasValidAuth()) {
    console.warn('validateAuth: No valid auth found');
    return false;
  }
  return true;
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