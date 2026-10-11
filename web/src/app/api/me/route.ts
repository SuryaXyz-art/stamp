import { eq } from "drizzle-orm";
import { z } from "zod";
import { users } from "@/lib/db/schema";
import { byteLength } from "@/lib/format";
import { HttpError, json, route } from "@/lib/server/api";
import { deletePrivyUser } from "@/lib/server/privy";
import { clearSession } from "@/lib/server/session";
import { getUser, toPrivate } from "@/lib/server/users";

export const GET = route({ auth: "session", bucket: "read", needs: ["accounts"] }, async ({ did, db }) => {
  const user = await getUser(db, did);
  if (!user) throw new HttpError(404, "No Stamp profile yet.");
  return json({ profile: toPrivate(user) });
});

/** Bidi overrides and control characters let a name visually impersonate someone else. */
const UNSAFE_CHARS = /[\u0000-\u001f\u007f‎‏‪-‮⁦-⁩]/;

const patch = z
  .object({
    displayName: z
      .string()
      .trim()
      .max(40, "Names can be 40 characters at most.")
      .refine((s) => !UNSAFE_CHARS.test(s), "That name has invisible control characters.")
      .nullable()
      .optional(),
    avatarSource: z.enum(["identicon", "twitter", "discord"]).optional(),
    privacy: z.object({ showTwitter: z.boolean().optional(), showDiscord: z.boolean().optional() }).strict().optional(),
    onboarding: z
      .object({
        price: z
          .string()
          .regex(/^\d{1,40}$/)
          .optional(),
        headline: z
          .string()
          .refine((s) => byteLength(s) <= 160, "Headlines are 160 bytes at most.")
          .optional(),
        done: z.boolean().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const PATCH = route({ auth: "session", bucket: "write", needs: ["accounts"], body: patch }, async ({ did, db, body }) => {
  const user = await getUser(db, did);
  if (!user) throw new HttpError(404, "No Stamp profile yet.");
  if (body.avatarSource && body.avatarSource !== "identicon" && !user.accounts.some((a) => a.type === body.avatarSource)) {
    throw new HttpError(400, `Link your ${body.avatarSource === "twitter" ? "X" : "Discord"} account first.`);
  }
  const [updated] = await db
    .update(users)
    .set({
      ...(body.displayName !== undefined && { displayName: body.displayName || null }),
      ...(body.avatarSource && { avatarSource: body.avatarSource }),
      ...(body.privacy && { privacy: { ...user.privacy, ...body.privacy } }),
      ...(body.onboarding && { onboarding: { ...user.onboarding, ...body.onboarding } }),
      updatedAt: new Date(),
    })
    .where(eq(users.id, did))
    .returning();
  return json({ profile: toPrivate(updated) });
});

/** Delete the Stamp account: our row, then the Privy user (when PRIVY_APP_SECRET is set). On-chain history stays. */
export const DELETE = route(
  { auth: "session", bucket: "write", needs: ["accounts"], body: z.object({ confirm: z.literal("DELETE", "Type DELETE to confirm.") }) },
  async ({ did, db }) => {
    await db.delete(users).where(eq(users.id, did));
    let privyDeleted = false;
    try {
      privyDeleted = await deletePrivyUser(did);
    } catch (err) {
      console.error("[api] privy delete", err);
    }
    const res = json({ ok: true, privyDeleted });
    clearSession(res);
    return res;
  },
);
