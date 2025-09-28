/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  env: {
    NEXARA_API_URL: process.env.NEXARA_API_URL || 'http://localhost:3002',
    NEXARA_WS_URL: process.env.NEXARA_WS_URL || 'http://localhost:3002',
  },
  async rewrites() {
    return [
      {
        source: '/api/nexara/:path*',
        destination: 'http://localhost:3002/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
