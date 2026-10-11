import { describe, expect, it } from "vitest";
import { buildCsp, createNonce, staticSecurityHeaders } from "./security-headers";

const directives = (csp: string) =>
  Object.fromEntries(
    csp.split("; ").map((d) => {
      const [name, ...values] = d.split(" ");
      return [name, values];
    }),
  );

const base = { nonce: "abc123", isDev: false, rpcUrls: ["https://rpc.testnet.arc.io", "https://rpc.mainnet.arc.io/v1?key=x"], walletConnect: false, privy: false };

describe("buildCsp", () => {
  it("only runs nonce'd scripts in production", () => {
    const d = directives(buildCsp(base));
    expect(d["script-src"]).toEqual(["'self'", "'nonce-abc123'", "'strict-dynamic'"]);
    expect(d["script-src"]).not.toContain("'unsafe-inline'");
    expect(d["script-src"]).not.toContain("'unsafe-eval'");
  });

  it("blocks framing, plugins and base/form hijacking", () => {
    const d = directives(buildCsp(base));
    expect(d["frame-ancestors"]).toEqual(["'none'"]);
    expect(d["object-src"]).toEqual(["'none'"]);
    expect(d["base-uri"]).toEqual(["'self'"]);
    expect(d["form-action"]).toEqual(["'self'"]);
    expect(d["upgrade-insecure-requests"]).toEqual([]);
  });

  it("allows RPC origins without leaking paths or query strings", () => {
    const d = directives(buildCsp(base));
    expect(d["connect-src"]).toContain("https://rpc.testnet.arc.io");
    expect(d["connect-src"]).toContain("https://rpc.mainnet.arc.io");
    expect(buildCsp(base)).not.toContain("key=x");
  });

  it("ignores malformed or non-http RPC urls", () => {
    const d = directives(buildCsp({ ...base, rpcUrls: ["not a url", "javascript:alert(1)", "https://ok.example"] }));
    expect(d["connect-src"]).toContain("https://ok.example");
    expect(d["connect-src"].join(" ")).not.toContain("javascript");
  });

  it("allows WalletConnect hosts only when it's configured", () => {
    expect(buildCsp(base)).not.toContain("walletconnect");
    const d = directives(buildCsp({ ...base, walletConnect: true }));
    expect(d["connect-src"]).toContain("wss://*.walletconnect.org");
    expect(d["frame-src"]).toContain("https://verify.walletconnect.org");
  });

  it("allows Privy's auth, iframe and bot check only when Privy is configured", () => {
    expect(buildCsp(base)).not.toContain("privy");
    const d = directives(buildCsp({ ...base, privy: true }));
    expect(d["connect-src"]).toContain("https://auth.privy.io");
    expect(d["frame-src"]).toEqual(expect.arrayContaining(["https://auth.privy.io", "https://challenges.cloudflare.com"]));
    expect(d["child-src"]).toContain("https://auth.privy.io");
    // Still nonce-only for scripts: no host allowlist that could widen what runs.
    expect(d["script-src"]).toEqual(["'self'", "'nonce-abc123'", "'strict-dynamic'"]);
  });

  it("never repeats a source", () => {
    for (const values of Object.values(directives(buildCsp({ ...base, privy: true, walletConnect: true })))) {
      expect(new Set(values).size).toBe(values.length);
    }
  });

  it("relaxes only what dev tooling needs", () => {
    const d = directives(buildCsp({ ...base, isDev: true }));
    expect(d["script-src"]).toContain("'unsafe-eval'");
    expect(d["connect-src"]).toContain("ws://localhost:*");
    expect(d["upgrade-insecure-requests"]).toBeUndefined();
  });
});

describe("createNonce", () => {
  it("is 128-bit base64 and unique", () => {
    const a = createNonce();
    expect(atob(a)).toHaveLength(16);
    expect(createNonce()).not.toBe(a);
  });
});

describe("staticSecurityHeaders", () => {
  it("sets the baseline headers", () => {
    const keys = staticSecurityHeaders.map((h) => h.key);
    expect(keys).toEqual(
      expect.arrayContaining(["Strict-Transport-Security", "X-Frame-Options", "X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy"]),
    );
  });
});
