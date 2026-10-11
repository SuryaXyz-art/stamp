import "server-only";
import { createPublicKey, createVerify, type KeyObject } from "node:crypto";
import { decodeEventLog, isAddressEqual, type Hex } from "viem";
import { stampBoxAbi } from "@/generated/stampBoxAbi";
import type { NetworkKey } from "@/lib/chains";
import { getNetworkConfig } from "@/lib/config";
import type { ChainEventKind, StampStatusName } from "@/lib/db/schema";
import { env } from "./env";

/**
 * Circle Contracts event monitors → our webhook. Circle signs the raw body with ECDSA P-256 / SHA-256; the public key
 * for `X-Circle-Key-Id` comes from Circle's API and never changes for a given id, so it's cached for the process.
 * https://developers.circle.com/api-reference/verify-webhook-signatures
 */

const CIRCLE_API = "https://api.circle.com";
const keys = new Map<string, Promise<KeyObject>>();

async function fetchKey(keyId: string): Promise<KeyObject> {
  const res = await fetch(`${CIRCLE_API}/v2/notifications/publicKey/${encodeURIComponent(keyId)}`, {
    headers: { authorization: `Bearer ${env().circleApiKey}` },
  });
  if (!res.ok) throw new Error(`Circle public key lookup failed (${res.status})`);
  const { data } = (await res.json()) as { data?: { publicKey?: string; algorithm?: string } };
  if (!data?.publicKey) throw new Error("Circle returned no public key");
  return createPublicKey({ key: Buffer.from(data.publicKey, "base64"), format: "der", type: "spki" });
}

export async function verifyCircleSignature(rawBody: string, signatureB64: string, keyId: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(keyId)) return false;
  let key = keys.get(keyId);
  if (!key) {
    key = fetchKey(keyId);
    keys.set(keyId, key);
    key.catch(() => keys.delete(keyId));
  }
  try {
    return createVerify("SHA256").update(rawBody).verify(await key, Buffer.from(signatureB64, "base64"));
  } catch {
    return false;
  }
}

/** Tests only. */
export function resetCircleKeys() {
  keys.clear();
}

export type CircleEventLog = {
  contractAddress: string;
  blockchain: string;
  txHash: string;
  blockHeight?: number | string;
  topics: string[];
  data: string;
};

export type DecodedStampEvent = {
  network: NetworkKey;
  stampId: string;
  kind: ChainEventKind;
  status: StampStatusName;
  actor: string;
  receiver: string | null;
  amount: string | null;
  txHash: string;
  blockNumber: number;
};

const STATUS: StampStatusName[] = ["pending", "refunded", "kept", "reclaimed"];
const NETWORK_BY_CIRCLE: Record<string, NetworkKey> = { ARC: "mainnet", "ARC-TESTNET": "testnet" };

/** Null for anything that isn't a Sent/Settled log from our own StampBox on an Arc network we serve. */
export function decodeStampEvent(n: CircleEventLog): DecodedStampEvent | null {
  const network = NETWORK_BY_CIRCLE[n.blockchain];
  if (!network) return null;
  const box = getNetworkConfig(network).stampBox;
  if (!box || !/^0x[0-9a-fA-F]{40}$/.test(n.contractAddress) || !isAddressEqual(n.contractAddress as Hex, box)) return null;
  let log;
  try {
    log = decodeEventLog({ abi: stampBoxAbi, topics: n.topics as [Hex, ...Hex[]], data: n.data as Hex });
  } catch {
    return null;
  }
  const blockNumber = Number(n.blockHeight ?? 0);
  if (log.eventName === "Sent") {
    const a = log.args;
    return {
      network,
      stampId: a.id.toString(),
      kind: "sent",
      status: "pending",
      actor: a.from.toLowerCase(),
      receiver: a.to.toLowerCase(),
      amount: a.amount.toString(),
      txHash: n.txHash,
      blockNumber,
    };
  }
  if (log.eventName === "Settled") {
    const a = log.args;
    return {
      network,
      stampId: a.id.toString(),
      kind: "settled",
      status: STATUS[Number(a.status)] ?? "pending",
      actor: a.by.toLowerCase(),
      receiver: null,
      amount: null,
      txHash: n.txHash,
      blockNumber,
    };
  }
  return null;
}
