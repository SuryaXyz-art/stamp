import { join } from "node:path";
import type { NextConfig } from "next";
import { staticSecurityHeaders } from "./src/lib/security-headers";

// RainbowKit -> @base-org/account -> @coinbase/cdp-sdk lazily imports optional x402 payment packages
// (and WalletConnect optionally pulls pino-pretty). Stamp uses none of them, so they resolve to an empty module.
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
  // The per-request CSP is set in src/proxy.ts; these apply to every response, assets included.
  async headers() {
    return [{ source: "/:path*", headers: staticSecurityHeaders }];
  },
};

export default nextConfig;
