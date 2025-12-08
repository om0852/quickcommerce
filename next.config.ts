import type { NextConfig } from "next";

const nextConfig = {
  experimental: {
    instrumentationHook: true,
  },
} as NextConfig;

export default nextConfig;
