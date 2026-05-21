import type { NextConfig } from "next";

// API_URL is a server-side var used only for the rewrite proxy — no NEXT_PUBLIC_ needed.
// Falls back to NEXT_PUBLIC_API_URL (for backwards compat) then localhost.
// const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const API_URL = process.env.NEXT_PUBLIC_API_URL;
console.log('[Admin] NEXT_PUBLIC_API_URL in next.config.ts:', process.env.NEXT_PUBLIC_API_URL);


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
