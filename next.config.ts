import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      canvas: "./lib/shims/canvas.ts",
    },
  },
};

export default nextConfig;
