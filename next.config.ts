import type { NextConfig } from 'next';

/**
 * Where the API runs. The browser never calls it directly: it calls /api/* on this site, and Next forwards
 * the request. Cookies stay first-party that way, and nothing needs CORS.
 */
const API_ORIGIN = (process.env.API_ORIGIN || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:4000')).replace(/\/$/, '');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // A production build with no API set forwards nothing, so /api/* is a plain 404 rather than a hanging request.
    return API_ORIGIN ? [{ source: '/api/:path*', destination: API_ORIGIN + '/:path*' }] : [];
  },
};

export default nextConfig;
