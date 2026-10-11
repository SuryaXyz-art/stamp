import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { resetEnv } from "@/lib/server/env";
import { getDb, resetDb } from "./index";

describe("getDb", () => {
  afterAll(() => {
    delete process.env.DATABASE_URL;
    resetEnv();
    resetDb();
  });

  it("is null when DATABASE_URL isn't set", async () => {
    delete process.env.DATABASE_URL;
    resetEnv();
    resetDb();
    expect(await getDb()).toBeNull();
  });

  it("creates missing parent folders for a file-backed PGlite and runs migrations", async () => {
    const dir = join(mkdtempSync(join(tmpdir(), "stamp-db-")), "nested", "pglite");
    process.env.DATABASE_URL = `pglite:${dir}`;
    resetEnv();
    resetDb();
    const db = await getDb();
    const rows = await db!.execute(sql`select count(*)::int as n from users`);
    expect((rows as unknown as { rows: { n: number }[] }).rows[0].n).toBe(0);
  });
});
