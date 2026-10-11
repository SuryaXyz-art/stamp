import { z } from "zod";
import { checkHandle } from "@/lib/handles";
import { HttpError, json, route } from "@/lib/server/api";
import { getUserByHandle, issueHandleChallenge } from "@/lib/server/users";

const body = z.object({
  handle: z.string().max(64),
  address: z.string().regex(/^0x[0-9a-fA-F]{40}$/, "Invalid address."),
  chainId: z.number().int().positive(),
});

/** Step 1 of claiming a handle: get the exact message to sign. */
export const POST = route({ auth: "session", bucket: "handle", needs: ["accounts"], body }, async ({ did, db, body }) => {
  const check = checkHandle(body.handle);
  if (!check.ok) throw new HttpError(400, check.error);
  const owner = await getUserByHandle(db, check.handle);
  if (owner && owner.id !== did) throw new HttpError(409, `@${check.handle} is taken.`);
  return json(issueHandleChallenge(did, check.handle, body.address, body.chainId));
});
