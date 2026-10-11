import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDb, type Db } from "@/lib/db";
import { features } from "./env";
import { AuthError, verifyAccessToken } from "./privy";
import { allow, type Bucket } from "./ratelimit";
import { CSRF_HEADER, readSession, safeEqual, type Session } from "./session";

/**
 * Every API route goes through `route()`:
 * feature check → same-origin check (writes) → rate limit → Privy access token → session + CSRF → zod → handler.
 * Errors come back as `{ error }` JSON with a proper status; internals are never leaked.
 */

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const json = (data: unknown, init?: number | ResponseInit) =>
  NextResponse.json(data, typeof init === "number" ? { status: init, headers: noStore } : { ...init, headers: { ...noStore, ...init?.headers } });

const noStore = { "cache-control": "no-store" };

type Need = "auth" | "db" | "accounts";

type Options<B extends z.ZodType | undefined> = {
  /** "session": Privy token + our session cookie (+ CSRF on writes). "token": Privy token only (creating the session). */
  auth?: "none" | "token" | "session";
  bucket: Bucket;
  needs?: Need[];
  body?: B;
};

type Context<B> = {
  req: NextRequest;
  ip: string;
  /** Privy DID when auth isn't "none". */
  did: string;
  session: Session | null;
  body: B;
  db: Db;
};

export function clientIp(req: NextRequest): string {
  return req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

const isWrite = (method: string) => !["GET", "HEAD", "OPTIONS"].includes(method);

function sameOrigin(req: NextRequest): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return false;
  const origin = req.headers.get("origin");
  if (!origin) return Boolean(site); // browsers always send one of the two on writes
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function route<B extends z.ZodType | undefined = undefined, P = Record<string, string>>(
  opts: Options<B>,
  handler: (ctx: Context<B extends z.ZodType ? z.infer<B> : undefined>, params: P) => Promise<Response>,
) {
  return async (req: NextRequest, segment?: { params: Promise<P> }): Promise<Response> => {
    try {
      const f = features();
      const needs: Need[] = [...(opts.needs ?? []), ...(opts.auth && opts.auth !== "none" ? (["auth"] as Need[]) : [])];
      for (const n of needs) if (!f[n]) throw new HttpError(503, n === "db" ? "Storage isn't configured on this server." : "Accounts aren't configured on this server.");

      const write = isWrite(req.method);
      if (write && !sameOrigin(req)) throw new HttpError(403, "Cross-site request blocked.");

      const ip = clientIp(req);
      if (!(await allow(opts.bucket, ip))) throw new HttpError(429, "Too many requests. Try again in a minute.");

      let did = "";
      let session: Session | null = null;
      if (opts.auth === "token" || opts.auth === "session") {
        const header = req.headers.get("authorization");
        did = await verifyAccessToken(header?.startsWith("Bearer ") ? header.slice(7) : null);
        if (!(await allow(opts.bucket, did))) throw new HttpError(429, "Too many requests. Try again in a minute.");
      }
      if (opts.auth === "session") {
        session = await readSession(req);
        if (!session || session.did !== did) throw new HttpError(401, "Your session expired. Sign in again.");
        if (write && !safeEqual(req.headers.get(CSRF_HEADER) ?? "", session.csrf)) throw new HttpError(403, "Security check failed. Reload the page.");
      }

      let body: unknown = undefined;
      if (opts.body) {
        let raw: unknown;
        try {
          raw = write ? await req.json() : Object.fromEntries(req.nextUrl.searchParams);
        } catch {
          throw new HttpError(400, "Malformed request.");
        }
        const parsed = opts.body.safeParse(raw);
        if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid request.");
        body = parsed.data;
      }

      const db = (needs.includes("db") || needs.includes("accounts") ? await getDb() : null) as Db;
      const params = (segment ? await segment.params : {}) as P;
      return await handler({ req, ip, did, session, body: body as never, db }, params);
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message }, err.status);
      if (err instanceof AuthError) return json({ error: err.message }, err.status);
      console.error("[api]", req.method, req.nextUrl.pathname, err);
      return json({ error: "Something went wrong on our side." }, 500);
    }
  };
}
