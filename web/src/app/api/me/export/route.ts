import { HttpError, route } from "@/lib/server/api";
import { getUser } from "@/lib/server/users";

/** Everything Stamp stores about you, as a JSON download. */
export const GET = route({ auth: "session", bucket: "read", needs: ["accounts"] }, async ({ did, db }) => {
  const user = await getUser(db, did);
  if (!user) throw new HttpError(404, "No Stamp profile yet.");
  const data = {
    exportedAt: new Date().toISOString(),
    note: "This is everything Stamp stores off-chain. Stamps, messages and inbox prices live on Arc and are public there.",
    profile: user,
  };
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="stamp-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "cache-control": "no-store",
    },
  });
});
