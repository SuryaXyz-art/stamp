import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { chainEvents } from "@/lib/db/schema";
import { json } from "@/lib/server/api";
import { decodeStampEvent, verifyCircleSignature, type CircleEventLog } from "@/lib/server/circle";
import { features } from "@/lib/server/env";

const MAX_BODY = 64 * 1024;

/**
 * Circle Contracts event monitors (registered by `pnpm launch circle`) POST StampBox's Sent/Settled logs here.
 * Server-to-server, so this skips the same-origin/CSRF wrapper; the ECDSA signature is the authentication instead.
 * Always 2xx for things we deliberately ignore, so Circle doesn't retry them.
 */

/** Reachability check: webhook providers probe the URL (HEAD or GET) before saving a subscription. */
export function HEAD() {
  return new Response(null, { status: 200 });
}
export function GET() {
  return json({ ok: true });
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (raw.length > MAX_BODY) return json({ error: "Payload too large." }, 413);

  const signature = req.headers.get("x-circle-signature");
  const keyId = req.headers.get("x-circle-key-id");
  // Endpoint checks and test pings arrive unsigned; acknowledge them without trusting or storing anything.
  if (!signature || !keyId) return json({ ok: true, ignored: "unsigned" });
  if (!features().circle) return json({ ok: true, ignored: "not configured" });

  let valid = false;
  try {
    valid = await verifyCircleSignature(raw, signature, keyId);
  } catch (err) {
    console.error("[circle] signature check failed", err);
    return json({ error: "Couldn't verify the signature." }, 503); // Circle retries later
  }
  if (!valid) return json({ error: "Invalid signature." }, 401);

  let body: { notificationType?: string; notification?: CircleEventLog };
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "Malformed JSON." }, 400);
  }
  if (body.notificationType !== "contracts.eventLog" || !body.notification) return json({ ok: true, ignored: body.notificationType ?? "unknown" });

  const event = decodeStampEvent(body.notification);
  if (!event) return json({ ok: true, ignored: "not a StampBox event" });

  const db = await getDb();
  // Circle retries deliveries; the (network, stamp, kind) primary key makes them idempotent.
  await db!.insert(chainEvents).values(event).onConflictDoNothing();
  return json({ ok: true, stored: `${event.kind} #${event.stampId}` });
}
