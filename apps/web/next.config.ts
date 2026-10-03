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
    // Next 16 allowlists image qualities and defaults to [75]; any other value
    // is rejected with a 400 rather than falling back. 95 is here for the hero
    // artwork — a smooth gradient, which is what lossy re-encoding bands most.
    qualities: [75, 95],
  },
};

export default nextConfig;
