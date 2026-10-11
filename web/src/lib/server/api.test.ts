import { exportSPKI, generateKeyPair, SignJWT, type CryptoKey } from "jose";
import { NextRequest } from "next/server";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { resetDb } from "@/lib/db";
import { resetEnv } from "./env";

/**
 * End-to-end tests of the API route handlers against an in-process Postgres (PGlite), with Privy tokens minted
 * from a locally generated ES256 key pair. Covers auth, CSRF, origin checks, validation and the handle proof.
 */

const APP = "test-app";
const ORIGIN = "http://localhost:3000";
let privyKey: CryptoKey;
let otherKey: CryptoKey;

const alice = { did: "did:privy:alice", wallet: privateKeyToAccount(generatePrivateKey()) };
const bob = { did: "did:privy:bob", wallet: privateKeyToAccount(generatePrivateKey()) };

async function mint(sub: string, claims: Record<string, unknown> = {}, opts: { key?: CryptoKey; aud?: string; exp?: string } = {}) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "ES256" })
    .setIssuer("privy.io")
    .setAudience(opts.aud ?? APP)
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime(opts.exp ?? "1h")
    .sign(opts.key ?? privyKey);
}

const linked = (u: typeof alice, extra: object[] = []) =>
  JSON.stringify([
    { type: "wallet", address: u.wallet.address, chain_type: "ethereum", wallet_client_type: "privy" },
    { type: "email", address: `${u.did}@example.com` },
    ...extra,
  ]);

type Jar = Record<string, string>;

function req(path: string, init: { method?: string; token?: string; jar?: Jar; csrf?: boolean | string; body?: unknown; origin?: string | null } = {}) {
  const headers = new Headers({ host: "localhost:3000" });
  const method = init.method ?? "GET";
  if (method !== "GET") {
    if (init.origin !== null) headers.set("origin", init.origin ?? ORIGIN);
    headers.set("sec-fetch-site", init.origin && init.origin !== ORIGIN ? "cross-site" : "same-origin");
    headers.set("content-type", "application/json");
  }
  if (init.token) headers.set("authorization", `Bearer ${init.token}`);
  if (init.jar) headers.set("cookie", Object.entries(init.jar).map(([k, v]) => `${k}=${v}`).join("; "));
  if (init.csrf) headers.set("x-csrf-token", init.csrf === true ? (init.jar?.stamp_csrf ?? "") : init.csrf);
  return new NextRequest(new URL(path, ORIGIN), { method, headers, body: init.body === undefined ? undefined : JSON.stringify(init.body) });
}

function jarFrom(res: Response): Jar {
  const jar: Jar = {};
  for (const c of res.headers.getSetCookie()) {
    const [pair] = c.split(";");
    const [k, v] = pair.split("=");
    jar[k] = v;
  }
  return jar;
}

const routes = {
  health: () => import("@/app/api/health/route"),
  session: () => import("@/app/api/auth/session/route"),
  me: () => import("@/app/api/me/route"),
  exportMe: () => import("@/app/api/me/export/route"),
  handles: () => import("@/app/api/handles/route"),
  challenge: () => import("@/app/api/handles/challenge/route"),
  claim: () => import("@/app/api/handles/claim/route"),
  profile: () => import("@/app/api/profiles/[handle]/route"),
  resolve: () => import("@/app/api/resolve/route"),
};

async function signIn(u: typeof alice, extra: object[] = []) {
  const { POST } = await routes.session();
  const token = await mint(u.did);
  const res = await POST(req("/api/auth/session", { method: "POST", token, body: { idToken: await mint(u.did, { linked_accounts: linked(u, extra) }) } }));
  return { res, token, jar: jarFrom(res), body: await res.json() };
}

beforeAll(async () => {
  const pair = await generateKeyPair("ES256", { extractable: true });
  privyKey = pair.privateKey;
  otherKey = (await generateKeyPair("ES256")).privateKey;
  Object.assign(process.env, {
    NEXT_PUBLIC_PRIVY_APP_ID: APP,
    PRIVY_VERIFICATION_KEY: (await exportSPKI(pair.publicKey)).replace(/\n/g, "\\n"),
    SESSION_SECRET: "s".repeat(48),
    DATABASE_URL: "pglite:memory",
  });
  delete process.env.UPSTASH_REDIS_REST_URL;
  resetEnv();
  resetDb();
});

afterAll(() => {
  for (const k of ["NEXT_PUBLIC_PRIVY_APP_ID", "PRIVY_VERIFICATION_KEY", "SESSION_SECRET", "DATABASE_URL"]) delete process.env[k];
  resetEnv();
  resetDb();
});

describe("health", () => {
  it("reports which features are on", async () => {
    const { GET } = await routes.health();
    expect(await (await GET(req("/api/health"))).json()).toEqual({ auth: true, db: true, accounts: true, rateLimit: false });
  });
});

describe("session", () => {
  it("rejects missing, foreign-app, forged and expired tokens", async () => {
    const { POST } = await routes.session();
    const body = { idToken: await mint(alice.did, { linked_accounts: linked(alice) }) };
    for (const token of [undefined, await mint(alice.did, {}, { aud: "other-app" }), await mint(alice.did, {}, { key: otherKey }), await mint(alice.did, {}, { exp: "-1m" })]) {
      const res = await POST(req("/api/auth/session", { method: "POST", token, body }));
      expect(res.status).toBe(401);
    }
  });

  it("rejects an identity token for a different user", async () => {
    const { POST } = await routes.session();
    const res = await POST(req("/api/auth/session", { method: "POST", token: await mint(alice.did), body: { idToken: await mint(bob.did, { linked_accounts: linked(bob) }) } }));
    expect(res.status).toBe(401);
  });

  it("creates the profile, keeps no email, and sets HttpOnly session + readable CSRF cookies", async () => {
    const { res, body } = await signIn(alice, [{ type: "twitter_oauth", username: "alice", profile_picture_url: "https://pbs.twimg.com/a_normal.jpg", subject: "1" }]);
    expect(res.status).toBe(200);
    expect(body.profile.address).toBe(alice.wallet.address);
    expect(body.profile.avatarSource).toBe("twitter");
    expect(body.profile.avatarUrl).toBe("https://pbs.twimg.com/a_400x400.jpg");
    expect(JSON.stringify(body)).not.toContain("@example.com");
    const cookies = res.headers.getSetCookie();
    expect(cookies.find((c) => c.startsWith("stamp_session="))).toMatch(/HttpOnly/i);
    expect(cookies.find((c) => c.startsWith("stamp_csrf="))).not.toMatch(/HttpOnly/i);
    expect(cookies.every((c) => /SameSite=lax/i.test(c))).toBe(true);
  });

  it("refuses to create a profile without a wallet", async () => {
    const { POST } = await routes.session();
    const did = "did:privy:nowallet";
    const res = await POST(req("/api/auth/session", { method: "POST", token: await mint(did), body: { idToken: await mint(did, { linked_accounts: "[]" }) } }));
    expect(res.status).toBe(409);
  });
});

describe("me", () => {
  it("needs the session cookie and a token for the same user", async () => {
    const { GET } = await routes.me();
    const a = await signIn(alice);
    expect((await GET(req("/api/me", { token: a.token }))).status).toBe(401);
    expect((await GET(req("/api/me", { token: await mint(bob.did), jar: a.jar }))).status).toBe(401);
    expect((await GET(req("/api/me", { token: a.token, jar: a.jar }))).status).toBe(200);
  });

  it("blocks writes without CSRF, with a wrong CSRF, or from another origin", async () => {
    const { PATCH } = await routes.me();
    const a = await signIn(alice);
    const body = { displayName: "Alice" };
    expect((await PATCH(req("/api/me", { method: "PATCH", token: a.token, jar: a.jar, body }))).status).toBe(403);
    expect((await PATCH(req("/api/me", { method: "PATCH", token: a.token, jar: a.jar, csrf: "nope", body }))).status).toBe(403);
    expect((await PATCH(req("/api/me", { method: "PATCH", token: a.token, jar: a.jar, csrf: true, body, origin: "https://evil.example" }))).status).toBe(403);
    expect((await PATCH(req("/api/me", { method: "PATCH", token: a.token, jar: a.jar, csrf: true, body, origin: null }))).status).toBe(200);
    const ok = await PATCH(req("/api/me", { method: "PATCH", token: a.token, jar: a.jar, csrf: true, body }));
    expect((await ok.json()).profile.displayName).toBe("Alice");
  });

  it("validates input: bidi tricks, unknown keys, unlinked avatar sources", async () => {
    const { PATCH } = await routes.me();
    const a = await signIn(alice);
    const send = (body: unknown) => PATCH(req("/api/me", { method: "PATCH", token: a.token, jar: a.jar, csrf: true, body }));
    expect((await send({ displayName: "admin‮ecila" })).status).toBe(400);
    expect((await send({ isAdmin: true })).status).toBe(400);
    expect((await send({ avatarSource: "discord" })).status).toBe(400);
    expect((await send({ privacy: { showTwitter: false } })).status).toBe(200);
  });
});

describe("handles", () => {
  async function claim(u: typeof alice, handle: string, signer = u.wallet) {
    const s = await signIn(u);
    const { POST: challenge } = await routes.challenge();
    const { POST: submit } = await routes.claim();
    const c = await challenge(req("/api/handles/challenge", { method: "POST", token: s.token, jar: s.jar, csrf: true, body: { handle, address: u.wallet.address, chainId: 5042002 } }));
    if (c.status !== 200) return c;
    const { message, token } = await c.json();
    const signature = await signer.signMessage({ message });
    return submit(req("/api/handles/claim", { method: "POST", token: s.token, jar: s.jar, csrf: true, body: { token, signature } }));
  }

  it("checks format, reserved words and availability", async () => {
    const { GET } = await routes.handles();
    const q = async (v: string) => (await GET(req(`/api/handles?q=${encodeURIComponent(v)}`))).json();
    expect((await q("ab")).available).toBe(false);
    expect((await q("admin")).error).toMatch(/reserved/);
    expect((await q("Ålice")).available).toBe(false);
    expect((await q("@Alice_1")).handle).toBe("alice_1");
  });

  it("binds a handle with a signature from the linked wallet", async () => {
    const res = await claim(alice, "alice");
    expect(res.status).toBe(200);
    const { profile } = await res.json();
    expect(profile.handle).toBe("alice");
    expect(profile.proof.message).toContain("@alice");
  });

  it("rejects a signature from another key, a tampered token and a taken handle", async () => {
    expect((await claim(bob, "bobby", alice.wallet)).status).toBe(400);
    expect((await claim(bob, "alice")).status).toBe(409);

    const s = await signIn(bob);
    const { POST: challenge } = await routes.challenge();
    const { POST: submit } = await routes.claim();
    const c = await (await challenge(req("/api/handles/challenge", { method: "POST", token: s.token, jar: s.jar, csrf: true, body: { handle: "bob", address: bob.wallet.address, chainId: 5042002 } }))).json();
    const forged = c.token.replace(/^[^.]+/, Buffer.from(JSON.stringify({ did: bob.did, handle: "alice" })).toString("base64url"));
    const sig = await bob.wallet.signMessage({ message: c.message });
    expect((await submit(req("/api/handles/claim", { method: "POST", token: s.token, jar: s.jar, csrf: true, body: { token: forged, signature: sig } }))).status).toBe(400);
  });

  it("expires challenges after 10 minutes", async () => {
    const s = await signIn(bob);
    const { POST: challenge } = await routes.challenge();
    const { POST: submit } = await routes.claim();
    const c = await (await challenge(req("/api/handles/challenge", { method: "POST", token: s.token, jar: s.jar, csrf: true, body: { handle: "bob", address: bob.wallet.address, chainId: 5042002 } }))).json();
    const signature = await bob.wallet.signMessage({ message: c.message });
    vi.useFakeTimers({ now: Date.now() + 11 * 60 * 1000, toFake: ["Date"] });
    try {
      const token = await mint(bob.did);
      expect((await submit(req("/api/handles/claim", { method: "POST", token, jar: s.jar, csrf: true, body: { token: c.token, signature } }))).status).toBe(400);
    } finally {
      vi.useRealTimers();
    }
  });

  it("refuses wallets that aren't linked to the account", async () => {
    const s = await signIn(bob);
    const { POST: challenge } = await routes.challenge();
    const { POST: submit } = await routes.claim();
    const c = await (await challenge(req("/api/handles/challenge", { method: "POST", token: s.token, jar: s.jar, csrf: true, body: { handle: "bob", address: alice.wallet.address, chainId: 5042002 } }))).json();
    const signature = await alice.wallet.signMessage({ message: c.message });
    expect((await submit(req("/api/handles/claim", { method: "POST", token: s.token, jar: s.jar, csrf: true, body: { token: c.token, signature } }))).status).toBe(403);
  });
});

describe("public profile, resolve, export and delete", () => {
  it("serves the public profile and respects privacy toggles", async () => {
    const { GET } = await routes.profile();
    const res = await GET(req("/api/profiles/alice"), { params: Promise.resolve({ handle: "alice" }) });
    const { profile } = await res.json();
    expect(profile.address).toBe(alice.wallet.address);
    expect(profile.badges.some((b: { type: string }) => b.type === "twitter")).toBe(false); // hidden earlier via privacy
    expect(JSON.stringify(profile)).not.toMatch(/did:privy|example\.com/);
    expect((await GET(req("/api/profiles/nobody"), { params: Promise.resolve({ handle: "nobody" }) })).status).toBe(404);
  });

  it("resolves an address to its handle", async () => {
    const { GET } = await routes.resolve();
    expect((await (await GET(req(`/api/resolve?address=${alice.wallet.address}`))).json()).profile.handle).toBe("alice");
    expect((await GET(req("/api/resolve?address=nope"))).status).toBe(400);
  });

  it("exports the user's data, then deletes the account only with confirmation", async () => {
    const a = await signIn(alice);
    const { GET: exportMe } = await routes.exportMe();
    const exp = await exportMe(req("/api/me/export", { token: a.token, jar: a.jar }));
    expect(exp.headers.get("content-disposition")).toMatch(/attachment/);
    expect((await exp.json()).profile.handle).toBe("alice");

    const { DELETE, GET } = await routes.me();
    expect((await DELETE(req("/api/me", { method: "DELETE", token: a.token, jar: a.jar, csrf: true, body: { confirm: "yes" } }))).status).toBe(400);
    const del = await DELETE(req("/api/me", { method: "DELETE", token: a.token, jar: a.jar, csrf: true, body: { confirm: "DELETE" } }));
    expect(del.status).toBe(200);
    expect(del.headers.getSetCookie().some((c) => c.startsWith("stamp_session=;"))).toBe(true);
    expect((await GET(req("/api/me", { token: a.token, jar: a.jar }))).status).toBe(404);
  });
});

describe("feature flags", () => {
  it("answers 503 instead of crashing when storage isn't configured", async () => {
    const url = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    resetEnv();
    try {
      const { GET } = await routes.handles();
      expect((await GET(req("/api/handles?q=alice"))).status).toBe(503);
    } finally {
      process.env.DATABASE_URL = url;
      resetEnv();
    }
  });
});
