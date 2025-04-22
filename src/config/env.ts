// Centralized URLs
// export const config = {
//   API_BASE_URL: 'https://api-rebrivo.onrender.com/v1/api',
//   MAIN_WEBSITE_BASE_URL: 'http://localhost:3000',
//   DASHBOARD_BASE_URL: 'https://rebrivo-seller.vercel.app',
// };

// export const getLoginRedirectUrl = (role: string = 'seller') => {
//   return `${config.MAIN_WEBSITE_BASE_URL}/auth/login?role=${role}`;
// };



// src/config/env.ts
export const config = {
  API_BASE_URL: () => 'https://api-rebrivo.onrender.com/v1/api',
  MAIN_WEBSITE_BASE_URL: () => {
    if (typeof window === 'undefined') {
      return 'https://rebrivo-website.netlify.app'; // Default for SSR
    }
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:3000'
      : 'https://rebrivo-website.netlify.app';
  },
  DASHBOARD_BASE_URL: () => {
    if (typeof window === 'undefined') {
      return 'https://rebrivo-seller-dashboard.netlify.app'; // Default for SSR
    }
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:3001'
      : 'https://rebrivo-seller-dashboard.netlify.app'; // Updated to new hosted URL
  },
};

export const getLoginRedirectUrl = (role: string = 'seller') => {
  return `${config.MAIN_WEBSITE_BASE_URL()}/auth/login?role=${role}`;
};


// // src/config/env.ts
// export const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// // Centralized URLs
// export const config = {
//   API_BASE_URL: 'https://api-rebrivo.onrender.com/v1/api',
//   MAIN_WEBSITE_BASE_URL: isLocalhost
//     ? 'http://localhost:3000'
//     : 'https://rebrivo.vercel.app',
//   DASHBOARD_BASE_URL: isLocalhost
//     ? 'http://localhost:3001'
//     : 'https://dashboard.rebrivo.vercel.app', // Update this later
// };

// export const getLoginRedirectUrl = (role: string = 'seller') => {
//   return `${config.MAIN_WEBSITE_BASE_URL}/auth/login?role=${role}`;
// };


// src/config/env.ts
// export const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';





