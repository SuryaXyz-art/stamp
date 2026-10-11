/**
 * HTTP security headers. The CSP is built per request in `src/proxy.ts` (it carries a fresh script nonce);
 * the static headers are applied to every route, assets included, from `next.config.ts`.
 */

/** WalletConnect / Reown relay, verify iframe and wallet registry. Only allowed when WalletConnect is configured. */
const WALLETCONNECT = {
  connect: [
    "https://*.walletconnect.com",
    "https://*.walletconnect.org",
    "wss://*.walletconnect.com",
    "wss://*.walletconnect.org",
    "https://*.reown.com",
    "wss://*.reown.com",
    "https://api.web3modal.org",
  ],
  frame: ["https://verify.walletconnect.com", "https://verify.walletconnect.org", "https://secure.walletconnect.org"],
  img: ["https://api.web3modal.org", "https://explorer-api.walletconnect.com"],
};

/** Coinbase Wallet / Base Account SDK (the wallet itself opens in a popup, which CSP doesn't govern). */
const COINBASE = { connect: ["https://*.coinbase.com", "wss://*.coinbase.com", "https://*.base.org", "wss://www.walletlink.org"] };

/**
 * Privy: auth API, embedded-wallet iframe, Cloudflare Turnstile (bot check) and Privy-hosted RPC.
 * Source: https://docs.privy.io/security/implementation-guide/content-security-policy
 * Turnstile's script is injected by Privy's own (nonce'd) code, so 'strict-dynamic' covers it.
 */
const PRIVY = {
  connect: ["https://auth.privy.io", "https://*.rpc.privy.systems", "wss://relay.walletconnect.com", "wss://relay.walletconnect.org", "https://explorer-api.walletconnect.com"],
  frame: ["https://auth.privy.io", "https://verify.walletconnect.com", "https://verify.walletconnect.org", "https://challenges.cloudflare.com"],
  img: ["https://explorer-api.walletconnect.com"],
};

export type CspOptions = {
  nonce: string;
  isDev: boolean;
  /** Every JSON-RPC endpoint the browser talks to (Arc mainnet/testnet, plus env overrides). */
  rpcUrls: string[];
  walletConnect: boolean;
  /** Privy is configured (NEXT_PUBLIC_PRIVY_APP_ID). */
  privy: boolean;
};

function origin(url: string): string | undefined {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" || u.protocol === "wss:" ? u.origin : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Scripts: nonce + 'strict-dynamic' only, so no inline or third-party script runs unless our own nonce'd
 * bundle loads it. Styles allow 'unsafe-inline' because wallet modals, toasts and motion set inline styles;
 * user content is always rendered as React text, never as HTML.
 */
export function buildCsp({ nonce, isDev, rpcUrls, walletConnect, privy }: CspOptions): string {
  const rpcOrigins = [...new Set(rpcUrls.map(origin).filter((o): o is string => Boolean(o)))];
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(isDev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", ...(walletConnect ? WALLETCONNECT.img : []), ...(privy ? PRIVY.img : [])],
    "font-src": ["'self'"],
    "connect-src": [
      "'self'",
      ...rpcOrigins,
      ...COINBASE.connect,
      ...(walletConnect ? WALLETCONNECT.connect : []),
      ...(privy ? PRIVY.connect : []),
      ...(isDev ? ["ws://localhost:*", "ws://127.0.0.1:*"] : []),
    ],
    "frame-src": ["'self'", ...(walletConnect ? WALLETCONNECT.frame : []), ...(privy ? PRIVY.frame : [])],
    "child-src": ["'self'", ...(privy ? PRIVY.frame : [])],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  const parts = Object.entries(directives).map(([k, v]) => `${k} ${[...new Set(v)].join(" ")}`);
  if (!isDev) parts.push("upgrade-insecure-requests");
  return parts.join("; ");
}

/** A 128-bit random nonce, base64-encoded. */
export function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

export const staticSecurityHeaders: { key: string; value: string }[] = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Coinbase Wallet talks to its popup via window.opener, so popups keep their opener.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), hid=(), bluetooth=(), midi=(), " +
      "magnetometer=(), gyroscope=(), accelerometer=(), browsing-topics=(), " +
      // Passkeys and "copy private key" also run inside Privy's iframe.
      'publickey-credentials-get=(self "https://auth.privy.io"), publickey-credentials-create=(self "https://auth.privy.io"), ' +
      'clipboard-write=(self "https://auth.privy.io")',
  },
];
