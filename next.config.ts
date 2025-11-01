/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '200mb',
    },
  },
  reactStrictMode: true,

  // ✅ Add custom headers (for API timeouts or other headers)
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'x-vercel-timeout',
            value: '300', // 5 minutes
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
