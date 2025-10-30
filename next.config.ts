import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {}, // Use Turbopack with default settings
  output: 'standalone', // Optimize for deployment
};

export default nextConfig;
