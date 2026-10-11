import { z } from "zod";
import { json, route } from "@/lib/server/api";
import { verifyIdentityToken } from "@/lib/server/privy";
import { clearSession, createSession } from "@/lib/server/session";
import { toPrivate, upsertUser } from "@/lib/server/users";

const body = z.object({
  idToken: z.string().min(20).max(20_000),
  /** The wallet the browser is using; becomes the receiving wallet on first login if it's linked. */
  address: z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/)
    .optional(),
});

/** Exchange a verified Privy login for our HttpOnly session, refreshing the linked-account snapshot. */
export const POST = route({ auth: "token", bucket: "auth", needs: ["accounts"], body }, async ({ did, body, db }) => {
  const identity = await verifyIdentityToken(body.idToken);
  if (identity.did !== did) return json({ error: "Tokens belong to different users." }, 401);
  const user = await upsertUser(db, did, identity.accounts, body.address);
  const res = json({ profile: toPrivate(user) });
  await createSession(res, did);
  return res;
});

/** Sign out: drop our cookies. (Privy's own logout runs in the browser.) */
export const DELETE = route({ bucket: "auth" }, async () => {
  const res = json({ ok: true });
  clearSession(res);
  return res;
});
