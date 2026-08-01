import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Playwright uses 127.0.0.1 while `next dev` advertises localhost. Allowing
  // this loopback origin keeps development hydration/HMR available to E2E
  // without widening the production origin policy.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
