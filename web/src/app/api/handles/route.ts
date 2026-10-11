import { z } from "zod";
import { checkHandle } from "@/lib/handles";
import { json, route } from "@/lib/server/api";
import { getUserByHandle } from "@/lib/server/users";

/** GET /api/handles?q=name → is it valid and free? */
export const GET = route({ bucket: "handle", needs: ["db"], body: z.object({ q: z.string().max(64) }) }, async ({ db, body }) => {
  const check = checkHandle(body.q);
  if (!check.ok) return json({ available: false, error: check.error });
  const owner = await getUserByHandle(db, check.handle);
  return json({ handle: check.handle, available: !owner, error: owner ? `@${check.handle} is taken.` : undefined });
});
