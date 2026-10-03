import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  async redirects() {
    return [
      { source: "/explore", destination: "/home", permanent: true },
      { source: "/signin", destination: "/login", permanent: true },
    ];
  },
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
