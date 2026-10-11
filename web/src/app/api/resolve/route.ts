import { z } from "zod";
import { json, route } from "@/lib/server/api";
import { getUserByAddress, toPublic } from "@/lib/server/users";

const query = z.object({ address: z.string().regex(/^0x[0-9a-fA-F]{40}$/, "Invalid address.") });

/** Address → public profile (handle, name, avatar), or null. */
export const GET = route({ bucket: "read", needs: ["db"], body: query }, async ({ db, body }) => {
  const user = await getUserByAddress(db, body.address);
  return json({ profile: user?.handle ? toPublic(user) : null });
});
