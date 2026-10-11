import { z } from "zod";
import { badgeSvg } from "@/lib/badge";
import { DEFAULT_NETWORK } from "@/lib/config";
import { formatStampPrice } from "@/lib/format";
import { route } from "@/lib/server/api";
import { readInbox, resolveRecipient } from "@/lib/server/recipient";

const query = z.object({
  network: z.enum(["mainnet", "testnet"]).optional(),
  theme: z.enum(["dark", "light"]).optional(),
});

/** GET /badge/<address|handle>?theme=light → "STAMP | Message me · $1" SVG for READMEs, sites and email signatures. */
export const GET = route<typeof query, { id: string }>({ bucket: "read", body: query }, async ({ body }, { id }) => {
  const recipient = await resolveRecipient(id.replace(/\.svg$/, ""));
  let value = "inbox not found";
  if (recipient) {
    const inbox = await readInbox(body.network ?? DEFAULT_NETWORK, recipient.address);
    value = !inbox.deployed ? "coming soon" : inbox.open ? `message me · ${formatStampPrice(inbox.price)}` : "inbox closed";
  }
  return new Response(badgeSvg({ value, theme: body.theme }), {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=300, stale-while-revalidate=3600",
      // The SVG is static markup, but lock it down in case someone opens it directly.
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'",
      "x-content-type-options": "nosniff",
    },
  });
});
