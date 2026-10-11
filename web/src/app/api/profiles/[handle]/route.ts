import { checkHandle } from "@/lib/handles";
import { HttpError, json, route } from "@/lib/server/api";
import { getUserByHandle, toPublic } from "@/lib/server/users";

/** Public profile by handle. */
export const GET = route<undefined, { handle: string }>({ bucket: "read", needs: ["db"] }, async ({ db }, { handle }) => {
  const check = checkHandle(decodeURIComponent(handle));
  const user = check.ok ? await getUserByHandle(db, check.handle) : undefined;
  if (!user?.handle) throw new HttpError(404, "No such handle.");
  return json({ profile: toPublic(user) });
});
