import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverFunctions: {
    allowedOrigins: ['localhost', '127.0.0.1'],
  },
  experimental: {
    serverComponentsExternalPackages: ['child_process'],
  },
};

export default nextConfig;
