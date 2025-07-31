import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/zamboni-vibe",
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  }
};

export default nextConfig;
