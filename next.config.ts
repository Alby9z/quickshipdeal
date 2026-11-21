import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
const s3Public = process.env.S3_PUBLIC_URL ? new URL(process.env.S3_PUBLIC_URL) : null;

// Politique de sécurité du contenu. 'unsafe-inline' pour les scripts reste nécessaire
// au runtime Next.js sans nonce ; tous les autres vecteurs sont restreints.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://js.stripe.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' https://api.stripe.com${isDev ? " ws:" : ""}`,
  "frame-src https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
  "form-action 'self' https://checkout.stripe.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self \"https://checkout.stripe.com\")" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["bullmq", "ioredis", "pino", "@prisma/client"],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      ...(s3Public ? [{ protocol: s3Public.protocol.replace(":", "") as "https" | "http", hostname: s3Public.hostname }] : []),
      { protocol: "https", hostname: "**" },
    ],
  },
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default config;
