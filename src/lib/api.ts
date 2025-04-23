import axios, {
  AxiosError,
  AxiosResponse,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';
import Cookies from 'js-cookie';
import { config, getLoginRedirectUrl } from '../config/env';

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
  headers: { 'Content-Type': 'application/json' },
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

// Check if we have valid auth data
const hasValidAuth = () => {
  const accessToken = Cookies.get('accessToken');
  const sellerData = Cookies.get('sellerData');
  return !!accessToken && !!sellerData;
};

// Attach access token to every request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const accessToken = Cookies.get('accessToken');
  if (accessToken) {
    config.headers['Authorization'] = `Bearer ${accessToken}`;
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
        // Queue the request while refreshing token
        return new Promise<string | null>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest && token) {
              originalRequest.headers['Authorization'] = `Bearer ${token}`;
              return api(originalRequest as AxiosRequestConfig);
            } else {
              return Promise.reject('Original request or token is undefined');
            }
          })
          .catch((err) => Promise.reject(err));
      }

      isHandling401 = true;

      // Try to get a new token using refreshToken, if available
      const refreshToken = Cookies.get('refreshToken');
      const sellerDataStr = Cookies.get('sellerData');

      if (!refreshToken || !sellerDataStr) {
        console.warn('401: Missing refresh token or seller data, redirecting to login');
        isHandling401 = false;
        clearCookiesAndRedirect();
      }

      try {
        // Try to refresh the token
        const response = await axios.post(
          `${config.API_BASE_URL()}/auth/refresh-token`,
          { refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );

        if (response.status === 200 && response.data.accessToken) {
          const newToken = response.data.accessToken;
          // Store the new token
          Cookies.set('accessToken', newToken, {
            expires: 1 / 24, // 1 hour
            secure: true,
            sameSite: 'lax',
          });

          if (response.data.refreshToken) {
            Cookies.set('refreshToken', response.data.refreshToken, {
              expires: 1, // 1 day
              secure: true,
              sameSite: 'lax',
            });
          }

          // Process queue and retry request
          if (originalRequest) {
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          }

          processQueue(null, newToken);
          isHandling401 = false;

          if (originalRequest) {
            return api(originalRequest as AxiosRequestConfig);
          }
        } else {
          throw new Error('Failed to refresh token');
        }
      } catch (error) {
        processQueue(null);
        isHandling401 = false;

        // Check if the error is related to token refresh
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          console.error('Token refresh failed, redirecting to login');
          clearCookiesAndRedirect();
        } else {
          console.error('An unexpected error occurred during token refresh:', error);
        }

        return Promise.reject(axiosError);
      }
    }

    return Promise.reject(axiosError);
  }
);

// Helper to update tokens from response headers
const updateTokensFromHeaders = (response: AxiosResponse) => {
  const newAccessToken = response.headers['x-access-token'] as string | undefined;
  const newRefreshToken = response.headers['x-refresh-token'] as string | undefined;

  if (newAccessToken) {
    Cookies.set('accessToken', newAccessToken, {
      expires: 1 / 24, // 1 hour
      secure: true,
      sameSite: 'lax',
    });

    if (newRefreshToken) {
      Cookies.set('refreshToken', newRefreshToken, {
        expires: 1, // 1 day
        secure: true,
        sameSite: 'lax',
      });
    }
  }
};

// Helper to clear cookies and redirect
const clearCookiesAndRedirect = (error?: AxiosError) => {
  if (error && error.response?.status !== 401) {
    console.warn('Error is not recoverable, clearing cookies and redirecting to login');
  } else {
    console.log('Clearing cookies and redirecting to login');
  }

  Cookies.remove('accessToken');
  Cookies.remove('refreshToken');
  Cookies.remove('sellerData');
  Cookies.remove('role');

  // Add timestamp to prevent caching
  const timestamp = new Date().getTime();
  window.location.href = `${getLoginRedirectUrl('seller')}?t=${timestamp}`;
};

// Proactive token refresh
export const setupTokenRefresh = () => {
  const refreshInterval = 45 * 60 * 1000; // Every 45 minutes

  // Check authentication immediately
  if (!hasValidAuth()) {
    console.warn('setupTokenRefresh: No valid auth found, redirecting to login');
    clearCookiesAndRedirect();
    return;
  }

  setInterval(async () => {
    const accessToken = Cookies.get('accessToken');
    const refreshToken = Cookies.get('refreshToken');
    const sellerDataStr = Cookies.get('sellerData');

    if (accessToken && refreshToken && sellerDataStr) {
      try {
        const userId = JSON.parse(sellerDataStr).id;
        // Make a request to keep session alive
        await api.get('/wallets/fetch-info', {
          params: {
            userType: 'SELLER',
            userId,
          },
        });
      } catch {
        clearCookiesAndRedirect();
      }
    } else {
      console.warn('Proactive refresh skipped: Missing tokens or seller data');
      clearCookiesAndRedirect();
    }
  }, refreshInterval);
};

// Check auth on initial load
export const validateAuth = () => {
  const accessToken = Cookies.get('accessToken');
  const sellerData = Cookies.get('sellerData');
  const role = Cookies.get('role');

  if (!accessToken || !sellerData || role !== 'SELLER') {
    console.warn('validateAuth: No valid auth found');
    clearCookiesAndRedirect();
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