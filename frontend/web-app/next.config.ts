import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a self-contained server in .next/standalone for the
  // production Docker image (see frontend/web-app/Dockerfile).
  output: "standalone",
};

export default nextConfig;
