import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This app lives inside the mobile app's repo, which has its own
  // package-lock.json one level up — pin the workspace root to this
  // directory so Next.js doesn't guess wrong.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
