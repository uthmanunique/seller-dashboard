/** @type {import('next').NextConfig} */
// module.exports = {
//   eslint: {
//     ignoreDuringBuilds: false,
//     dirs: ['src'],
//     // Optionally disable specific rules
//     rules: {
//       '@typescript-eslint/no-unused-vars': 'off',
//       'react-hooks/exhaustive-deps': 'off',
//     },
//   },
// };
const nextConfig = {
  images: {
    domains: ['res.cloudinary.com'],
  },
};

module.exports = nextConfig;