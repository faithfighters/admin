import type { NextConfig } from "next";

// API_URL is a server-side var used only for the rewrite proxy — no NEXT_PUBLIC_ needed.
// Set API_URL in .env.local to override (e.g. for local dev: API_URL=http://localhost:4000)
// const rawApiUrl = 'http://localhost:4000';
const rawApiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://stage-api.faithfightersforamerica.com';
const API_URL = rawApiUrl.replace(/\/api\/?$/, '');


const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    qualities: [25, 50, 75, 90, 95, 100],
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  // Proxy all /api/* requests to the NestJS backend (strips /api prefix).
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
