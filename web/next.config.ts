import { join } from "node:path";
import type { NextConfig } from "next";
import { staticSecurityHeaders } from "./src/lib/security-headers";

// Wallet SDKs (Coinbase/Base account -> @coinbase/cdp-sdk) lazily import optional x402 payment packages, and
// WalletConnect optionally pulls pino-pretty. Stamp uses none of them, so they resolve to an empty module.
const optionalDeps = [
  "@x402/core/client",
  "@x402/evm",
  "@x402/evm/exact/client",
  "@x402/evm/upto/client",
  "@x402/svm/exact/client",
  "pino-pretty",
];

const nextConfig: NextConfig = {
  turbopack: {
    root: join(__dirname, ".."),
    resolveAlias: Object.fromEntries(optionalDeps.map((d) => [d, "./src/lib/empty-module.js"])),
  },
  poweredByHeader: false,
  // PGlite (local/test Postgres) loads its WASM via new URL(…, import.meta.url), which breaks when bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Profile pictures from X / Discord are fetched and re-served by Next's optimizer, so visitors' browsers
  // never contact those hosts (and the CSP can stay img-src 'self').
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "pbs.twimg.com" },
      { protocol: "https", hostname: "cdn.discordapp.com" },
    ],
  },
  // Public inboxes live at /@handle; "@" can't start a route folder name (it means a parallel route).
  async rewrites() {
    return [{ source: "/@:handle", destination: "/u/:handle" }];
  },
  // The per-request CSP is set in src/proxy.ts; these apply to every response, assets included.
  async headers() {
    return [{ source: "/:path*", headers: staticSecurityHeaders }];
  },
};

export default nextConfig;
