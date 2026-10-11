import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "./env";

/** Upstash sliding-window limits. Switched off (always allowed) when UPSTASH_* isn't configured. */

export type Bucket = "read" | "write" | "auth" | "handle";

const LIMITS: Record<Bucket, [number, `${number} ${"s" | "m"}`]> = {
  read: [120, "1 m"],
  write: [30, "1 m"],
  auth: [20, "1 m"],
  handle: [10, "1 m"],
};

let limiters: Map<Bucket, Ratelimit> | null | undefined;

function get(bucket: Bucket): Ratelimit | null {
  if (limiters === undefined) {
    const { upstashUrl, upstashToken } = env();
    if (!upstashUrl || !upstashToken) limiters = null;
    else {
      const redis = new Redis({ url: upstashUrl, token: upstashToken });
      limiters = new Map(
        (Object.keys(LIMITS) as Bucket[]).map((b) => [
          b,
          new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(...LIMITS[b]), prefix: `stamp:rl:${b}`, analytics: false }),
        ]),
      );
    }
  }
  return limiters?.get(bucket) ?? null;
}

/** true = allowed. `id` is a user DID when signed in, otherwise the client IP. */
export async function allow(bucket: Bucket, id: string): Promise<boolean> {
  const limiter = get(bucket);
  if (!limiter) return true;
  const { success } = await limiter.limit(id);
  return success;
}
