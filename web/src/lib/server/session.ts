import "server-only";
import { jwtVerify, SignJWT } from "jose";
import type { NextRequest, NextResponse } from "next/server";
import { env } from "./env";

/**
 * Our own session, separate from Privy's token (Privy's HttpOnly cookies need a verified production domain).
 * - `stamp_session`: HttpOnly, SameSite=Lax, HS256 JWT { sub: Privy DID, csrf }.
 * - `stamp_csrf`: readable by our JS, echoed in the `x-csrf-token` header on every write (double submit),
 *   and must equal the `csrf` claim inside the signed session.
 * Every authenticated API call also carries a fresh Privy access token, verified on each request.
 */

export const SESSION_COOKIE = "stamp_session";
export const CSRF_COOKIE = "stamp_csrf";
export const CSRF_HEADER = "x-csrf-token";
const MAX_AGE = 60 * 60 * 24 * 7;

const secret = () => new TextEncoder().encode(env().sessionSecret);

export type Session = { did: string; csrf: string };

export async function createSession(res: NextResponse, did: string): Promise<Session> {
  const csrf = Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString("base64url");
  const jwt = await new SignJWT({ csrf })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(did)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .setAudience("stamp")
    .sign(secret());
  const base = { path: "/", sameSite: "lax" as const, secure: env().isProd, maxAge: MAX_AGE };
  res.cookies.set(SESSION_COOKIE, jwt, { ...base, httpOnly: true });
  res.cookies.set(CSRF_COOKIE, csrf, { ...base, httpOnly: false });
  return { did, csrf };
}

export function clearSession(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(CSRF_COOKIE, "", { path: "/", maxAge: 0 });
}

export async function readSession(req: NextRequest): Promise<Session | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token || !env().sessionSecret) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { audience: "stamp", algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.csrf !== "string") return null;
    return { did: payload.sub, csrf: payload.csrf };
  } catch {
    return null;
  }
}

/** Constant-time string compare. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
