import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const nextConfig: NextConfig = {
  // Standalone output keeps the Docker image small (Dokploy/VPS deployment).
  output: "standalone",
  reactStrictMode: true,
  // Pin the workspace root to this project (avoids false lockfile detection
  // from unrelated package-lock.json files in parent directories).
  outputFileTracingRoot: fileURLToPath(new URL(".", import.meta.url)),
};

export default nextConfig;
