import "server-only";
import { z } from "zod";

/**
 * Server configuration. Every key is optional: a missing key switches the matching feature off
 * (the UI hides it, API routes answer 503), it never crashes the app.
 */
const schema = z.object({
  NEXT_PUBLIC_PRIVY_APP_ID: z.string().trim().optional(),
  /** Dashboard → Configuration → App settings → "Verification key" (PEM, SPKI). `\n` escapes are accepted. */
  PRIVY_VERIFICATION_KEY: z.string().trim().optional(),
  /** Only used to delete the Privy user when someone deletes their Stamp account. */
  PRIVY_APP_SECRET: z.string().trim().optional(),
  /** 32+ random bytes; signs session cookies and handle-claim challenges. */
  SESSION_SECRET: z.string().trim().optional(),
  /** postgres://… (Neon), or pglite:<dir> / pglite:memory for local development and tests. */
  DATABASE_URL: z.string().trim().optional(),
  UPSTASH_REDIS_REST_URL: z.string().trim().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().trim().optional(),
  /** Circle Developer Console API key; verifies Circle's signed webhooks (contract event monitors). */
  CIRCLE_API_KEY: z.string().trim().optional(),
});

function read() {
  const e = schema.parse(process.env);
  const empty = (v?: string) => (v ? v : undefined);
  const sessionSecret = e.SESSION_SECRET && e.SESSION_SECRET.length >= 32 ? e.SESSION_SECRET : undefined;
  return {
    privyAppId: empty(e.NEXT_PUBLIC_PRIVY_APP_ID),
    privyVerificationKey: empty(e.PRIVY_VERIFICATION_KEY)?.replace(/\\n/g, "\n"),
    privyAppSecret: empty(e.PRIVY_APP_SECRET),
    sessionSecret,
    databaseUrl: empty(e.DATABASE_URL),
    upstashUrl: empty(e.UPSTASH_REDIS_REST_URL),
    upstashToken: empty(e.UPSTASH_REDIS_REST_TOKEN),
    circleApiKey: empty(e.CIRCLE_API_KEY),
    isProd: process.env.NODE_ENV === "production",
  };
}

export type ServerEnv = ReturnType<typeof read>;

let cached: ServerEnv | undefined;
/** Read once per process. Tests call `resetEnv()` after changing process.env. */
export function env(): ServerEnv {
  return (cached ??= read());
}
export function resetEnv() {
  cached = undefined;
}

/** Which backend features are switched on. Exposed to the browser via GET /api/health. */
export function features() {
  const e = env();
  const auth = Boolean(e.privyAppId && e.privyVerificationKey && e.sessionSecret);
  return {
    auth,
    db: Boolean(e.databaseUrl),
    /** Accounts (profiles, handles, settings) need both sign-in and storage. */
    accounts: auth && Boolean(e.databaseUrl),
    rateLimit: Boolean(e.upstashUrl && e.upstashToken),
    /** Circle webhooks feed the activity index; they need the API key (signature check) and storage. */
    circle: Boolean(e.circleApiKey && e.databaseUrl),
  };
}
