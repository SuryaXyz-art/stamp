import { z } from "zod";
import { json, route } from "@/lib/server/api";
import { claimHandle, toPrivate } from "@/lib/server/users";

const body = z.object({
  token: z.string().min(10).max(2000),
  signature: z
    .string()
    .regex(/^0x[0-9a-fA-F]+$/, "Invalid signature.")
    .max(4000),
});

/** Step 2: submit the wallet's signature; the handle is bound to that wallet. */
export const POST = route({ auth: "session", bucket: "handle", needs: ["accounts"], body }, async ({ did, db, body }) => {
  const user = await claimHandle(db, did, body.token, body.signature as `0x${string}`);
  return json({ profile: toPrivate(user) });
});
