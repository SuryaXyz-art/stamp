import { NextRequest } from "next/server";
import { decodeFunctionData, parseEther } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { stampBoxAbi } from "@/generated/stampBoxAbi";
import { badgeSvg } from "@/lib/badge";
import { getNetworkConfig } from "@/lib/config";

/** The unauthenticated surfaces: the agent quote API and the badge. Chain reads and profile lookups are faked. */

const OPEN = "0x1111111111111111111111111111111111111111";
const CLOSED = "0x2222222222222222222222222222222222222222";
const prices: Record<string, bigint> = { [OPEN]: parseEther("1"), [CLOSED]: 0n };

vi.mock("@/lib/clients", () => ({
  getPublicClient: () => ({
    readContract: async ({ functionName, args }: { functionName: string; args: [string] }) =>
      functionName === "priceOf" ? (prices[args[0].toLowerCase()] ?? 0n) : "Ask me about <Arc> & USDC",
  }),
}));

vi.mock("@/lib/server/profiles", () => ({
  profileByAddress: async (a: string) => (a.toLowerCase() === OPEN ? { handle: "alice", address: OPEN, displayName: "Alice" } : null),
  profileByHandle: async (h: string) => (h === "alice" ? { handle: "alice", address: OPEN, displayName: "Alice" } : null),
}));

const req = (path: string) => new NextRequest(new URL(path, "http://localhost:3000"));
const quote = async (qs: string) => {
  const { GET } = await import("@/app/api/v1/stamp/route");
  return GET(req(`/api/v1/stamp?network=testnet&${qs}`));
};
const badge = async (id: string, qs = "network=testnet") => {
  const { GET } = await import("@/app/badge/[id]/route");
  return GET(req(`/badge/${id}?${qs}`), { params: Promise.resolve({ id }) });
};

beforeEach(() => {
  delete process.env.UPSTASH_REDIS_REST_URL;
});

describe("GET /api/v1/stamp", () => {
  it("quotes an inbox by address, with open CORS and no transaction", async () => {
    const res = await quote(`to=${OPEN}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    const body = await res.json();
    expect(body.chainId).toBe(5042002);
    expect(body.contract).toBe(getNetworkConfig("testnet").stampBox);
    expect(body.recipient).toMatchObject({ handle: "alice", url: expect.stringMatching(/\/@alice$/) });
    expect(body.inbox).toMatchObject({ open: true, price: parseEther("1").toString(), priceUsdc: "$1.00" });
    expect(body.tx).toBeUndefined();
  });

  it("returns a ready-to-sign send() for a handle and a message", async () => {
    const body = await (await quote("to=@alice&message=" + encodeURIComponent("Hi Alice ✉"))).json();
    expect(body.tx.to).toBe(getNetworkConfig("testnet").stampBox);
    expect(body.tx.value).toBe(parseEther("1").toString());
    const call = decodeFunctionData({ abi: stampBoxAbi, data: body.tx.data });
    expect(call.functionName).toBe("send");
    expect(call.args).toEqual([expect.stringMatching(new RegExp(OPEN, "i")), "Hi Alice ✉"]);
  });

  it("rejects unknown handles, closed inboxes and oversized or empty messages", async () => {
    expect((await quote("to=nobody")).status).toBe(404);
    expect((await quote(`to=${CLOSED}&message=hi`)).status).toBe(409);
    expect((await quote(`to=${OPEN}&message=${"x".repeat(1001)}`)).status).toBe(400);
    expect((await quote(`to=${OPEN}&message=`)).status).toBe(400);
    expect((await quote("")).status).toBe(400);
  });
});

describe("GET /badge/[id]", () => {
  it("renders the live price as a locked-down SVG", async () => {
    const res = await badge("alice");
    expect(res.headers.get("content-type")).toMatch(/^image\/svg\+xml/);
    expect(res.headers.get("content-security-policy")).toContain("default-src 'none'");
    expect(await res.text()).toContain("message me · $1");
  });

  it("says when an inbox is closed or unknown", async () => {
    expect(await (await badge(CLOSED)).text()).toContain("inbox closed");
    expect(await (await badge("nobody")).text()).toContain("inbox not found");
  });

  it("escapes text and supports a light theme", () => {
    const svg = badgeSvg({ value: `<script>"&'`, theme: "light" });
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;&quot;&amp;&apos;");
    expect(svg).toContain("#FFFFFF");
  });
});
