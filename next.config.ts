import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  typescript: {
    // Run type checking separately in CI — don't block the build
    ignoreBuildErrors: process.env.CI !== "true",
  },
  // Critical: Baileys uses Node.js APIs (fs, net, crypto, tls) that can't be
  // bundled for edge/browser. These packages MUST be externalized for serverless.
  serverExternalPackages: [
    '@whiskeysockets/baileys',
    '@hapi/boom',
    'pino',
    'qrcode',
    'ws',
    'sharp',
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
