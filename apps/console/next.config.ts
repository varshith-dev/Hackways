import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // assetPrefix scopes all /_next/ static assets under /console/_next/
  // so nginx can route them directly to port 3001 without a fallback from
  // the web app (port 3000). This permanently fixes the broken-CSS problem
  // that occurs every time the console is rebuilt with a new BUILD_ID.
  assetPrefix: process.env.NODE_ENV === "production" ? "/console" : "",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "crinmedia.blob.core.windows.net",
      },
    ],
    qualities: [75, 95],
  },
};

export default nextConfig;
