// src/lib/api.ts
import axios from 'axios';
import Cookies from 'js-cookie';
import { config, getLoginRedirectUrl } from '../config/env';

const api = axios.create({
  baseURL: config.API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const accessToken = Cookies.get('accessToken');
  if (accessToken) {
    config.headers['Authorization'] = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = Cookies.get('refreshToken');
      if (!refreshToken) {
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
        Cookies.remove('sellerData');
        window.location.href = getLoginRedirectUrl('seller');
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(
          `${config.API_BASE_URL}/auth/refresh`,
          { token: refreshToken }
        );
        const newAccessToken = data.accessToken;

        Cookies.set('accessToken', newAccessToken, {
          expires: 15 / (24 * 60), // 15 minutes
          secure: true, // Always secure in production
          sameSite: 'strict',
        });

        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        console.error('Refresh failed:', refreshErr);
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
        Cookies.remove('sellerData');
        window.location.href = getLoginRedirectUrl('seller');
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  }
);

export default api;







// // src/lib/api.ts
// import axios from 'axios';
// import Cookies from 'js-cookie';
// import { config, getLoginRedirectUrl, isLocalhost } from '../config/env';

// const api = axios.create({
//   baseURL: config.API_BASE_URL,
//   headers: { 'Content-Type': 'application/json' },
// });

// api.interceptors.request.use((config) => {
//   const accessToken = Cookies.get('accessToken');
//   if (accessToken) {
//     config.headers['Authorization'] = `Bearer ${accessToken}`;
//   }
//   return config;
// });

// api.interceptors.response.use(
//   (response) => response,
//   async (error) => {
//     const originalRequest = error.config;
//     if (error.response?.status === 401 && !originalRequest._retry) {
//       originalRequest._retry = true;

//       const refreshToken = Cookies.get('refreshToken');
//       if (!refreshToken) {
//         Cookies.remove('accessToken');
//         Cookies.remove('refreshToken');
//         Cookies.remove('sellerData');
//         window.location.href = getLoginRedirectUrl('seller');
//         return Promise.reject(error);
//       }

//       try {
//         const { data } = await axios.post(
//           `${config.API_BASE_URL}/auth/refresh`,
//           { token: refreshToken }
//         );
//         const newAccessToken = data.accessToken;

//         Cookies.set('accessToken', newAccessToken, {
//           expires: 15 / (24 * 60), // 15 minutes
//           secure: !isLocalhost, // Secure in production only
//           sameSite: 'strict',
//         });

//         originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
//         return api(originalRequest);
//       } catch (refreshErr) {
//         console.error('Refresh failed:', refreshErr);
//         Cookies.remove('accessToken');
//         Cookies.remove('refreshToken');
//         Cookies.remove('sellerData');
//         window.location.href = getLoginRedirectUrl('seller');
//         return Promise.reject(refreshErr);
//       }
//     }
//     return Promise.reject(error);
//   }
// );

// export default api;







// // src/lib/api.ts
// import axios from 'axios';
// import Cookies from 'js-cookie';
// import { config, getLoginRedirectUrl } from '../config/env';

// const api = axios.create({
//   baseURL: config.API_BASE_URL(),
//   headers: { 'Content-Type': 'application/json' },
// });

// api.interceptors.request.use((config) => {
//   const accessToken = Cookies.get('accessToken');
//   if (accessToken) {
//     config.headers['Authorization'] = `Bearer ${accessToken}`;
//   }
//   return config;
// });

// api.interceptors.response.use(
//   (response) => response,
//   async (error) => {
//     const originalRequest = error.config;
//     if (error.response?.status === 401 && !originalRequest._retry) {
//       originalRequest._retry = true;

//       const refreshToken = Cookies.get('refreshToken');
//       if (!refreshToken) {
//         Cookies.remove('accessToken');
//         Cookies.remove('refreshToken');
//         Cookies.remove('sellerData');
//         window.location.href = getLoginRedirectUrl('seller');
//         return Promise.reject(error);
//       }

//       try {
//         const { data } = await axios.post(
//           `${config.API_BASE_URL()}/auth/refresh`,
//           { token: refreshToken }
//         );
//         const newAccessToken = data.accessToken;

//         Cookies.set('accessToken', newAccessToken, {
//           expires: 15 / (24 * 60),
//           secure: typeof window !== 'undefined' &&
//             (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'),
//           sameSite: 'strict',
//         });

//         originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
//         return api(originalRequest);
//       } catch (refreshErr) {
//         console.error('Refresh failed:', refreshErr);
//         Cookies.remove('accessToken');
//         Cookies.remove('refreshToken');
//         Cookies.remove('sellerData');
//         window.location.href = getLoginRedirectUrl('seller');
//         return Promise.reject(refreshErr);
//       }
//     }
//     return Promise.reject(error);
//   }
// );

// export default api;