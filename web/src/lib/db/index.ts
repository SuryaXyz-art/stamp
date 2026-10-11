import "server-only";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { env } from "@/lib/server/env";
import * as schema from "./schema";

/**
 * Neon over HTTP in production (`DATABASE_URL=postgres://…`, migrate with `pnpm db:migrate`).
 * `pglite:<dir>` or `pglite:memory` runs Postgres in-process for local development and tests, migrated on first use.
 * The neon-http driver has no interactive transactions, so queries here are single statements guarded by
 * unique indexes.
 */
export type Db = NeonHttpDatabase<typeof schema>;

let pending: Promise<Db> | undefined;

async function connect(url: string): Promise<Db> {
  if (url.startsWith("pglite:")) {
    const [{ PGlite }, { drizzle }, { migrate }] = await Promise.all([
      import("@electric-sql/pglite"),
      import("drizzle-orm/pglite"),
      import("drizzle-orm/pglite/migrator"),
    ]);
    const where = url.slice("pglite:".length);
    // PGlite creates only the last path segment, so make sure the parents exist (e.g. ./.data/pglite).
    if (where !== "memory") mkdirSync(resolve(where), { recursive: true });
    const client = where === "memory" ? new PGlite() : new PGlite(resolve(where));
    const db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder: join(process.cwd(), "drizzle") });
    // Same query-builder surface as neon-http; only the driver differs.
    return db as unknown as Db;
  }
  return drizzleNeon(neon(url), { schema });
}

/** The database, or null when DATABASE_URL isn't set (account features are then switched off). */
export async function getDb(): Promise<Db | null> {
  const url = env().databaseUrl;
  if (!url) return null;
  pending ??= connect(url).catch((err) => {
    pending = undefined;
    throw err;
  });
  return pending;
}

/** Tests only: forget the cached connection. */
export function resetDb() {
  pending = undefined;
}

export { schema };
