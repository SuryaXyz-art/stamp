import { generateKeyPairSync, sign } from "node:crypto";
import { NextRequest } from "next/server";
import { encodeAbiParameters, encodeEventTopics, parseEther, type Hex } from "viem";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { stampBoxAbi } from "@/generated/stampBoxAbi";
import { getNetworkConfig } from "@/lib/config";
import { resetDb } from "@/lib/db";
import { resetCircleKeys } from "./circle";
import { resetEnv } from "./env";

/** Circle webhook → signature check → decode StampBox logs → chain_events → /api/activity. */

const KEY_ID = "6a3b6a8e-1b1a-4a6e-9c4f-2f6a1c0d9e11";
const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
const spki = publicKey.export({ format: "der", type: "spki" }).toString("base64");
const BOX = getNetworkConfig("testnet").stampBox!;
const ALICE = "0x1111111111111111111111111111111111111111";
const BOB = "0x2222222222222222222222222222222222222222";

const realFetch = globalThis.fetch;

function sentLog(id: bigint) {
  return {
    topics: encodeEventTopics({ abi: stampBoxAbi, eventName: "Sent", args: { id, from: ALICE, to: BOB } }) as Hex[],
    data: encodeAbiParameters([{ type: "uint256" }, { type: "string" }], [parseEther("1"), "hello"]),
  };
}
function settledLog(id: bigint, status: number) {
  return {
    topics: encodeEventTopics({ abi: stampBoxAbi, eventName: "Settled", args: { id, by: BOB } }) as Hex[],
    data: encodeAbiParameters([{ type: "uint8" }, { type: "string" }], [status, "thanks!"]),
  };
}

function notification(log: { topics: Hex[]; data: Hex }, over: Record<string, unknown> = {}) {
  return JSON.stringify({
    subscriptionId: "s",
    notificationId: crypto.randomUUID(),
    notificationType: "contracts.eventLog",
    notification: { contractAddress: BOX.toLowerCase(), blockchain: "ARC-TESTNET", txHash: `0x${"ab".repeat(32)}`, blockHeight: 100, ...log, ...over },
    timestamp: new Date().toISOString(),
    version: 2,
  });
}

function post(body: string, { signed = true, tamper = false } = {}) {
  const headers = new Headers({ "content-type": "application/json" });
  if (signed) {
    headers.set("x-circle-key-id", KEY_ID);
    headers.set("x-circle-signature", sign("sha256", Buffer.from(body), privateKey).toString("base64"));
  }
  return new NextRequest("http://localhost:3000/api/webhooks/circle", { method: "POST", headers, body: tamper ? body.replace(`"blockHeight":100`, `"blockHeight":999`) : body });
}

const webhook = async (req: NextRequest) => (await import("@/app/api/webhooks/circle/route")).POST(req);
const activity = async () => {
  const { GET } = await import("@/app/api/activity/route");
  return (await (await GET(new NextRequest("http://localhost:3000/api/activity?network=testnet"))).json()).events;
};

beforeAll(() => {
  Object.assign(process.env, { CIRCLE_API_KEY: "TEST_API_KEY:x:y", DATABASE_URL: "pglite:memory" });
  delete process.env.UPSTASH_REDIS_REST_URL;
  resetEnv();
  resetDb();
  resetCircleKeys();
  vi.stubGlobal("fetch", async (url: string | URL, init?: RequestInit) => {
    if (String(url) === `https://api.circle.com/v2/notifications/publicKey/${KEY_ID}`) {
      expect(new Headers(init?.headers).get("authorization")).toBe("Bearer TEST_API_KEY:x:y");
      return Response.json({ data: { id: KEY_ID, algorithm: "ECDSA_SHA_256", publicKey: spki } });
    }
    return realFetch(url, init);
  });
});

afterAll(() => {
  vi.unstubAllGlobals();
  delete process.env.CIRCLE_API_KEY;
  delete process.env.DATABASE_URL;
  resetEnv();
  resetDb();
});

describe("POST /api/webhooks/circle", () => {
  it("stores a signed Sent and Settled event, idempotently, and serves them as activity", async () => {
    const sent = notification(sentLog(7n));
    expect(await (await webhook(post(sent))).json()).toEqual({ ok: true, stored: "sent #7" });
    expect((await webhook(post(sent))).status).toBe(200); // Circle retry: no duplicate
    expect((await webhook(post(notification(settledLog(7n, 1), { blockHeight: 101 })))).status).toBe(200);

    const events = await activity();
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ stampId: "7", kind: "settled", status: "refunded", amount: parseEther("1").toString() });
    expect(events[1]).toMatchObject({ stampId: "7", kind: "sent", status: "pending" });
    expect(JSON.stringify(events)).not.toMatch(/hello|thanks|0x1111|0x2222/); // no message text or addresses
  });

  it("rejects bad signatures and acknowledges unsigned pings without storing", async () => {
    expect((await webhook(post(notification(sentLog(8n)), { tamper: true }))).status).toBe(401);
    expect(await (await webhook(post(notification(sentLog(9n)), { signed: false }))).json()).toEqual({ ok: true, ignored: "unsigned" });
    expect((await activity()).some((e: { stampId: string }) => e.stampId === "8" || e.stampId === "9")).toBe(false);
  });

  it("ignores other contracts, other chains and other notification types", async () => {
    const other = await webhook(post(notification(sentLog(10n), { contractAddress: "0x3333333333333333333333333333333333333333" })));
    expect((await other.json()).ignored).toBe("not a StampBox event");
    const eth = await webhook(post(notification(sentLog(11n), { blockchain: "ETH" })));
    expect((await eth.json()).ignored).toBe("not a StampBox event");
    const tx = await webhook(post(JSON.stringify({ notificationType: "transactions.inbound", notification: {} })));
    expect((await tx.json()).ignored).toBe("transactions.inbound");
  });
});
