/** @type {import('next').NextConfig} */
const nextConfig = {
  // Proxy all /api calls to the Express backend in development
  async rewrites() {
    return [
      {
        source:      '/api/v1/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/v1/:path*`,
      },
      // Note: Do NOT proxy /api/auth/* because NextAuth needs to intercept them locally.
    ];
  },
};

module.exports = nextConfig;
