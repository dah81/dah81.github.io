import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  // Use basePath only in production so local dev runs at /
  basePath: isProd ? "/zamboni-driver" : undefined,
  assetPrefix: isProd ? "/zamboni-driver/" : undefined,
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
