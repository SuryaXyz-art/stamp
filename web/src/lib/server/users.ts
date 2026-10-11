import "server-only";
import { createHmac } from "node:crypto";
import { eq } from "drizzle-orm";
import { getAddress, isAddress, verifyMessage, type Address, type Hex } from "viem";
import { arcMainnet, arcTestnet } from "@/lib/chains";
import { getPublicClient } from "@/lib/clients";
import type { Db } from "@/lib/db";
import { users, type LinkedAccount, type User } from "@/lib/db/schema";
import { checkHandle, handleClaimMessage, type HandleClaim } from "@/lib/handles";
import { HttpError } from "./api";
import { env } from "./env";
import { safeEqual } from "./session";

/** All reads/writes of the users table. Every mutation is keyed by the caller's verified DID. */

const lower = (a: string) => a.toLowerCase();

export const walletsOf = (accounts: LinkedAccount[]) =>
  accounts.filter((a): a is Extract<LinkedAccount, { type: "wallet" }> => a.type === "wallet");

function isUniqueViolation(err: unknown, index?: string) {
  const e = err as { code?: string; constraint?: string; cause?: { code?: string; constraint?: string }; message?: string };
  const code = e.code ?? e.cause?.code;
  const constraint = e.constraint ?? e.cause?.constraint ?? e.message ?? "";
  return code === "23505" && (!index || constraint.includes(index));
}

export async function getUser(db: Db, did: string): Promise<User | undefined> {
  const [u] = await db.select().from(users).where(eq(users.id, did)).limit(1);
  return u;
}

export async function getUserByHandle(db: Db, handle: string): Promise<User | undefined> {
  const [u] = await db.select().from(users).where(eq(users.handle, handle.toLowerCase())).limit(1);
  return u;
}

export async function getUserByAddress(db: Db, address: string): Promise<User | undefined> {
  const [u] = await db.select().from(users).where(eq(users.address, lower(address))).limit(1);
  return u;
}

/**
 * Called when a session is created: refreshes the linked-account snapshot, creating the profile on first login.
 * The receiving wallet defaults to the one the browser is using (if linked), else the embedded wallet.
 */
export async function upsertUser(db: Db, did: string, accounts: LinkedAccount[], preferred?: string): Promise<User> {
  const existing = await getUser(db, did);
  if (existing) {
    const [u] = await db.update(users).set({ accounts, updatedAt: new Date() }).where(eq(users.id, did)).returning();
    return u;
  }
  const wallets = walletsOf(accounts);
  const pick =
    (preferred && wallets.find((w) => lower(w.address) === lower(preferred))) ?? wallets.find((w) => w.embedded) ?? wallets[0];
  if (!pick) throw new HttpError(409, "Your account has no wallet yet. Finish creating it, then try again.");
  const twitter = accounts.find((a) => a.type === "twitter");
  try {
    const [u] = await db
      .insert(users)
      .values({ id: did, address: lower(pick.address), accounts, avatarSource: twitter && "avatarUrl" in twitter && twitter.avatarUrl ? "twitter" : "identicon" })
      .returning();
    return u;
  } catch (err) {
    if (isUniqueViolation(err, "address")) throw new HttpError(409, "This wallet already belongs to another Stamp account.");
    throw err;
  }
}

// ───────────────────────────── handle claims ─────────────────────────────

const CHALLENGE_TTL_MS = 10 * 60 * 1000;
const chains = new Map<number, "testnet" | "mainnet">([
  [arcTestnet.id, "testnet"],
  [arcMainnet.id, "mainnet"],
]);

function sign(payload: string) {
  return createHmac("sha256", env().sessionSecret!).update(`handle-claim:${payload}`).digest("base64url");
}

/** Stateless challenge: the claim fields plus an HMAC binding them to this user. Valid for 10 minutes. */
export function issueHandleChallenge(did: string, rawHandle: string, address: string, chainId: number) {
  const check = checkHandle(rawHandle);
  if (!check.ok) throw new HttpError(400, check.error);
  if (!isAddress(address)) throw new HttpError(400, "Invalid address.");
  if (!chains.has(chainId)) throw new HttpError(400, "Unsupported network.");
  const claim: HandleClaim = {
    handle: check.handle,
    address: getAddress(address),
    chainId,
    nonce: Buffer.from(crypto.getRandomValues(new Uint8Array(12))).toString("base64url"),
    issuedAt: new Date().toISOString(),
  };
  const payload = Buffer.from(JSON.stringify({ did, ...claim })).toString("base64url");
  return { message: handleClaimMessage(claim), token: `${payload}.${sign(payload)}` };
}

function openChallenge(did: string, token: string): HandleClaim {
  const [payload, mac] = token.split(".");
  if (!payload || !mac || !safeEqual(sign(payload), mac)) throw new HttpError(400, "This claim link is invalid. Start again.");
  const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as HandleClaim & { did: string };
  if (data.did !== did) throw new HttpError(403, "This claim belongs to another account.");
  if (Date.now() - Date.parse(data.issuedAt) > CHALLENGE_TTL_MS) throw new HttpError(400, "This claim expired. Start again.");
  return data;
}

async function signatureValid(claim: HandleClaim, signature: Hex): Promise<boolean> {
  const message = handleClaimMessage(claim);
  const address = claim.address as Address;
  // Plain EOAs (including Privy embedded wallets) verify offline; smart-contract wallets need an ERC-1271 call.
  if (await verifyMessage({ address, message, signature }).catch(() => false)) return true;
  const client = getPublicClient(chains.get(claim.chainId)!);
  return client.verifyMessage({ address, message, signature }).catch(() => false);
}

/**
 * Binds a handle to an address the user controls. The address must be one of their linked wallets and the
 * signature must come from it. Re-claiming with another wallet moves the inbox to that wallet.
 */
export async function claimHandle(db: Db, did: string, token: string, signature: Hex): Promise<User> {
  const claim = openChallenge(did, token);
  const user = await getUser(db, did);
  if (!user) throw new HttpError(404, "Finish signing in first.");
  if (!walletsOf(user.accounts).some((w) => lower(w.address) === lower(claim.address))) {
    throw new HttpError(403, "That wallet isn't linked to your account.");
  }
  if (!(await signatureValid(claim, signature))) throw new HttpError(400, "The signature doesn't match that wallet.");
  try {
    const [u] = await db
      .update(users)
      .set({ handle: claim.handle, address: lower(claim.address), handleSig: signature, handleMessage: handleClaimMessage(claim), updatedAt: new Date() })
      .where(eq(users.id, did))
      .returning();
    return u;
  } catch (err) {
    if (isUniqueViolation(err, "handle")) throw new HttpError(409, `@${claim.handle} is taken.`);
    if (isUniqueViolation(err, "address")) throw new HttpError(409, "This wallet already belongs to another Stamp account.");
    throw err;
  }
}

// ───────────────────────────── views ─────────────────────────────

/** X serves 48px avatars by default; ask for the 400px one. */
const bigTwitterAvatar = (url: string) => url.replace(/_normal(\.\w+)$/, "_400x400$1");

export function avatarUrl(u: User): string | null {
  if (u.avatarSource === "twitter") {
    const t = u.accounts.find((a) => a.type === "twitter");
    if (t && "avatarUrl" in t && t.avatarUrl) return bigTwitterAvatar(t.avatarUrl);
  }
  if (u.avatarSource === "discord") {
    const d = u.accounts.find((a) => a.type === "discord");
    if (d && "avatarUrl" in d && d.avatarUrl) return d.avatarUrl;
  }
  return null;
}

export type Badge = { type: "twitter" | "discord" | "github"; username: string; url: string };

export function badgesOf(u: User, { includeHidden = false } = {}): Badge[] {
  const out: Badge[] = [];
  for (const a of u.accounts) {
    if (a.type === "twitter" && (includeHidden || u.privacy.showTwitter)) out.push({ type: "twitter", username: a.username, url: `https://x.com/${a.username}` });
    if (a.type === "discord" && (includeHidden || u.privacy.showDiscord)) out.push({ type: "discord", username: a.username, url: "" });
    if (a.type === "github") out.push({ type: "github", username: a.username, url: `https://github.com/${a.username}` });
  }
  return out;
}

export type PublicProfile = {
  handle: string | null;
  address: Address;
  displayName: string | null;
  avatarUrl: string | null;
  badges: Badge[];
  /** The signed message proving the handle↔address binding, so anyone can re-verify it. */
  proof: { message: string; signature: string } | null;
};

export function toPublic(u: User): PublicProfile {
  return {
    handle: u.handle,
    address: getAddress(u.address),
    displayName: u.displayName,
    avatarUrl: avatarUrl(u),
    badges: badgesOf(u),
    proof: u.handleSig && u.handleMessage ? { message: u.handleMessage, signature: u.handleSig } : null,
  };
}

export type PrivateProfile = PublicProfile & {
  id: string;
  avatarSource: User["avatarSource"];
  accounts: LinkedAccount[];
  privacy: User["privacy"];
  onboarding: User["onboarding"];
  createdAt: string;
};

export function toPrivate(u: User): PrivateProfile {
  return {
    ...toPublic(u),
    id: u.id,
    avatarSource: u.avatarSource,
    accounts: u.accounts,
    privacy: u.privacy,
    onboarding: u.onboarding,
    createdAt: u.createdAt.toISOString(),
  };
}
