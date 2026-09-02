/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure better-sqlite3 is treated as an external server package in Next.js
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
