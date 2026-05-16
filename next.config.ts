import type { NextConfig } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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
