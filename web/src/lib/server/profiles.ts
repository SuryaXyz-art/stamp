import "server-only";
import { getDb } from "@/lib/db";
import { checkHandle } from "@/lib/handles";
import { getUserByAddress, getUserByHandle, toPublic, type PublicProfile } from "./users";

/** Page-level lookups. A missing or unreachable database just means "no profile" (pages fall back to the address). */

export async function profileByHandle(raw: string): Promise<PublicProfile | null> {
  const check = checkHandle(raw);
  if (!check.ok) return null;
  try {
    const db = await getDb();
    const user = db ? await getUserByHandle(db, check.handle) : undefined;
    return user?.handle ? toPublic(user) : null;
  } catch (err) {
    console.error("[profiles] handle lookup failed", err);
    return null;
  }
}

export async function profileByAddress(address: string): Promise<PublicProfile | null> {
  try {
    const db = await getDb();
    const user = db ? await getUserByAddress(db, address) : undefined;
    return user?.handle ? toPublic(user) : null;
  } catch (err) {
    console.error("[profiles] address lookup failed", err);
    return null;
  }
}
