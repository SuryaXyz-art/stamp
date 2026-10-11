import "server-only";
import { importSPKI, jwtVerify, type CryptoKey } from "jose";
import { getAddress, isAddress } from "viem";
import type { LinkedAccount } from "@/lib/db/schema";
import { env } from "./env";

/**
 * Privy access and identity tokens are ES256 JWTs (iss "privy.io", aud = app id). We verify them locally against
 * the app's verification key, so no request goes to Privy.
 * Docs: https://docs.privy.io/authentication/user-authentication/access-tokens
 *       https://docs.privy.io/user-management/users/identity-tokens
 */

let keyPromise: { pem: string; key: Promise<CryptoKey> } | undefined;

function verificationKey(): Promise<CryptoKey> {
  const pem = env().privyVerificationKey;
  if (!pem) throw new AuthError("Sign-in isn't configured on this server.", 503);
  if (keyPromise?.pem !== pem) keyPromise = { pem, key: importSPKI(pem, "ES256") };
  return keyPromise.key;
}

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status = 401,
  ) {
    super(message);
  }
}

async function verify(token: string) {
  const appId = env().privyAppId;
  if (!appId) throw new AuthError("Sign-in isn't configured on this server.", 503);
  try {
    const { payload } = await jwtVerify(token, await verificationKey(), { issuer: "privy.io", audience: appId, algorithms: ["ES256"] });
    if (typeof payload.sub !== "string" || !payload.sub.startsWith("did:privy:")) throw new Error("bad sub");
    return payload;
  } catch (err) {
    if (err instanceof AuthError) throw err;
    throw new AuthError("Your session expired. Sign in again.");
  }
}

/** Returns the user's Privy DID. Throws AuthError when missing, expired, forged or for another app. */
export async function verifyAccessToken(token: string | undefined | null): Promise<string> {
  if (!token) throw new AuthError("Sign in first.");
  return (await verify(token)).sub as string;
}

type RawAccount = Record<string, unknown> & { type?: string };

const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
const httpsUrl = (v: unknown) => {
  const s = str(v);
  return s && s.startsWith("https://") ? s : undefined;
};

/** Map Privy's lightweight linked accounts to the minimum we keep. Emails and OAuth subjects are dropped on purpose. */
export function toLinkedAccounts(raw: RawAccount[]): LinkedAccount[] {
  const out: LinkedAccount[] = [];
  for (const a of raw) {
    switch (a.type) {
      case "twitter_oauth": {
        const username = str(a.username);
        if (username) out.push({ type: "twitter", username, avatarUrl: httpsUrl(a.profile_picture_url) });
        break;
      }
      case "discord_oauth": {
        const username = str(a.username);
        if (username) out.push({ type: "discord", username });
        break;
      }
      case "github_oauth": {
        const username = str(a.username);
        if (username) out.push({ type: "github", username });
        break;
      }
      case "google_oauth":
        out.push({ type: "google" });
        break;
      case "email":
        out.push({ type: "email" });
        break;
      case "passkey":
        out.push({ type: "passkey" });
        break;
      case "wallet": {
        const address = str(a.address);
        const chain = str(a.chain_type) ?? "ethereum";
        if (address && chain === "ethereum" && isAddress(address)) {
          out.push({ type: "wallet", address: getAddress(address), embedded: a.wallet_client_type === "privy" });
        }
        break;
      }
    }
  }
  return out;
}

/** Verifies an identity token and returns the DID plus the linked accounts it vouches for. */
export async function verifyIdentityToken(token: string | undefined | null): Promise<{ did: string; accounts: LinkedAccount[] }> {
  if (!token) throw new AuthError("Missing identity token. Enable identity tokens in the Privy dashboard.");
  const payload = await verify(token);
  let raw: unknown = [];
  try {
    raw = typeof payload.linked_accounts === "string" ? JSON.parse(payload.linked_accounts) : (payload.linked_accounts ?? []);
  } catch {
    raw = [];
  }
  return { did: payload.sub as string, accounts: toLinkedAccounts(Array.isArray(raw) ? (raw as RawAccount[]) : []) };
}

/** Deletes the user at Privy too (needs PRIVY_APP_SECRET). Returns false when not configured. */
export async function deletePrivyUser(did: string): Promise<boolean> {
  const { privyAppId, privyAppSecret } = env();
  if (!privyAppId || !privyAppSecret) return false;
  const res = await fetch(`https://auth.privy.io/api/v1/users/${encodeURIComponent(did)}`, {
    method: "DELETE",
    headers: {
      authorization: `Basic ${Buffer.from(`${privyAppId}:${privyAppSecret}`).toString("base64")}`,
      "privy-app-id": privyAppId,
    },
  });
  if (!res.ok && res.status !== 404) throw new Error(`Privy user deletion failed (${res.status})`);
  return true;
}
