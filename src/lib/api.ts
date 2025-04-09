// // src/lib/api.ts
// import axios from 'axios';
// import Cookies from 'js-cookie';

// const api = axios.create({
//   baseURL: 'https://api-rebrivo.onrender.com/v1/api',
//   headers: { 'Content-Type': 'application/json' },
// });

// api.interceptors.request.use((config) => {
//   const accessToken = Cookies.get('accessToken');
//   if (accessToken) {
//     config.headers['Authorization'] = `Bearer ${accessToken}`; // Match settings endpoints
//   }
//   return config;
// });

// api.interceptors.response.use(
//   (response) => response,
//   async (error) => {
//     const originalRequest = error.config;
//     if (error.response?.status === 401 && !originalRequest._retry) {
//       originalRequest._retry = true;
//       const accessToken = Cookies.get('accessToken');
//       if (!accessToken) {
//         window.location.href = 'http://localhost:3000/auth/login?role=seller';
//         return Promise.reject(error);
//       }

//       try {
//         const { data } = await axios.post(
//           'https://api-rebrivo.onrender.com/v1/api/auth/refresh',
//           { token: accessToken } // Backend expects { token }
//         );
//         const newAccessToken = data.accessToken;
//         Cookies.set('accessToken', newAccessToken, { expires: 1, secure: true, sameSite: 'strict' }); // 24 hours
//         originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
//         return api(originalRequest);
//       } catch (refreshErr) {
//         console.error('Refresh failed:', refreshErr);
//         Cookies.remove('accessToken');
//         Cookies.remove('sellerData');
//         window.location.href = 'http://localhost:3000/auth/login?role=seller';
//         return Promise.reject(refreshErr);
//       }
//     }
//     return Promise.reject(error);
//   }
// );

// export default api;

// src/lib/api.ts
import axios from 'axios';
import Cookies from 'js-cookie';

const api = axios.create({
  baseURL: 'https://api-rebrivo.onrender.com/v1/api',
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
        window.location.href = 'http://localhost:3000/auth/login?role=seller';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(
          'https://api-rebrivo.onrender.com/v1/api/auth/refresh',
          { token: refreshToken } // Use refreshToken here
        );
        const newAccessToken = data.accessToken;

        // Update accessToken in cookies (keep refreshToken unchanged)
        Cookies.set('accessToken', newAccessToken, { expires: 15 / (24 * 60), secure: true, sameSite: 'strict' }); // 15 minutes

        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        console.error('Refresh failed:', refreshErr);
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
        Cookies.remove('sellerData');
        window.location.href = 'http://localhost:3000/auth/login?role=seller';
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  }
);

export default api;