/**
 * Handles: ASCII only so they can't be spoofed with look-alike Unicode. Shared by the browser and the API.
 */

export const HANDLE_RE = /^[a-z0-9_]{3,20}$/;

/** Product routes, staff-looking names, brands people would impersonate, and obvious abuse. */
const RESERVED = new Set([
  // routes and system words
  "about", "admin", "api", "app", "badge", "blog", "docs", "help", "home", "inbox", "legal", "login", "logout", "me",
  "new", "null", "onboarding", "privacy", "profile", "root", "security", "send", "sent", "settings", "setup", "signin",
  "signup", "stamp", "stamps", "static", "status", "support", "system", "terms", "undefined", "user", "users", "www",
  "agent", "agents", "well_known", "llms", "u",
  // staff / trust
  "administrator", "moderator", "mod", "official", "staff", "team", "verified", "security_team", "billing", "payments",
  "abuse", "postmaster", "hostmaster", "webmaster", "noreply", "no_reply",
  // brands
  "arc", "circle", "usdc", "privy", "anthropic", "claude", "openai", "google", "x", "twitter", "discord", "github",
  "metamask", "coinbase", "ethereum", "vitalik",
]);

export type HandleCheck = { ok: true; handle: string } | { ok: false; error: string };

/** Lower-cases, strips a leading "@", and checks format + reserved list. */
export function checkHandle(input: string): HandleCheck {
  const handle = input.trim().replace(/^@/, "").toLowerCase();
  if (handle.length < 3) return { ok: false, error: "At least 3 characters." };
  if (handle.length > 20) return { ok: false, error: "20 characters at most." };
  if (!HANDLE_RE.test(handle)) return { ok: false, error: "Use a–z, 0–9 and _ only." };
  if (/^_|_$/.test(handle) || handle.includes("__")) return { ok: false, error: "No leading, trailing or double underscores." };
  if (/^0x[0-9a-f]*$/.test(handle)) return { ok: false, error: "Handles can't look like an address." };
  if (RESERVED.has(handle)) return { ok: false, error: "That handle is reserved." };
  return { ok: true, handle };
}

export type HandleClaim = { handle: string; address: string; chainId: number; nonce: string; issuedAt: string };

/** The exact text the wallet signs to bind a handle to an address (EIP-191 personal_sign). */
export function handleClaimMessage(c: HandleClaim): string {
  return [
    "Stamp handle claim",
    "",
    `I control ${c.address} and claim the Stamp handle @${c.handle}.`,
    "Signing is free and doesn't send a transaction.",
    "",
    `Handle: ${c.handle}`,
    `Address: ${c.address}`,
    `Chain ID: ${c.chainId}`,
    `Nonce: ${c.nonce}`,
    `Issued At: ${c.issuedAt}`,
  ].join("\n");
}
