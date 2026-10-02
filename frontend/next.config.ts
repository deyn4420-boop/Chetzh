import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "standalone" output bundles only the files needed to run the app
  // (no full node_modules) into .next/standalone - keeps the Docker
  // image small and matches what the Dockerfile here expects.
  output: "standalone",
};

export default nextConfig;
