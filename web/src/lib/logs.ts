import type { AbiEvent, Address, PublicClient } from "viem";
import { stampBoxAbi } from "@/generated/stampBoxAbi";

/**
 * Reading message text. Messages live only in `Sent` event logs, so we fetch logs.
 * Public RPCs cap the block range per eth_getLogs, so we scan in chunks and halve a chunk when the RPC refuses it.
 */

const sentEvent = stampBoxAbi.find((x) => x.type === "event" && x.name === "Sent") as AbiEvent;
const settledEvent = stampBoxAbi.find((x) => x.type === "event" && x.name === "Settled") as AbiEvent;

// Arc's public testnet RPC rejects ranges above 10k blocks ("requested range too large").
const INITIAL_CHUNK = 10_000n;
const MIN_CHUNK = 500n;

type ScanArgs = {
  client: PublicClient;
  address: Address;
  event: AbiEvent;
  args?: Record<string, unknown>;
  fromBlock: bigint;
  toBlock?: bigint;
  /** Stop early once every one of these ids has been seen (when looking up specific stamps). */
  ids?: bigint[];
};

async function scanLogs({ client, address, event, args, fromBlock, toBlock, ids }: ScanArgs) {
  const wanted = ids?.length ? new Set(ids) : undefined;
  const end = toBlock ?? (await client.getBlockNumber());
  const logs = [];
  let chunk = INITIAL_CHUNK;
  let from = fromBlock;
  let backoffs = 0;
  while (from <= end) {
    const to = from + chunk - 1n > end ? end : from + chunk - 1n;
    try {
      const page = await client.getLogs({ address, event, args, fromBlock: from, toBlock: to, strict: true });
      logs.push(...page);
      from = to + 1n;
      if (wanted) {
        for (const l of page) wanted.delete((l.args as { id: bigint }).id);
        if (!wanted.size) break;
      }
    } catch (err) {
      // Rate limited: wait and retry the same range. Anything else: assume the range was too big and halve it.
      if (/rate limit/i.test(String(err)) && backoffs < 5) {
        await new Promise((r) => setTimeout(r, 500 * 2 ** backoffs++));
        continue;
      }
      if (chunk <= MIN_CHUNK) throw err;
      chunk /= 2n;
    }
  }
  return logs;
}

/**
 * Arc blocks land every ~0.5s. We know each stamp's `sentAt`, so instead of scanning from the deployment block
 * we estimate the block for the earliest timestamp and start a little before it.
 */
async function estimateBlockAt(client: PublicClient, timestamp: bigint, floor: bigint): Promise<bigint> {
  const latest = await client.getBlock();
  if (latest.number <= floor) return floor;
  const anchor = await client.getBlock({ blockNumber: floor });
  const span = latest.timestamp - anchor.timestamp;
  if (span <= 0n) return floor;
  const blocksPerSecond = Number(latest.number - floor) / Number(span);
  const secondsBack = Number(latest.timestamp - timestamp);
  const estimate = latest.number - BigInt(Math.ceil(secondsBack * blocksPerSecond * 1.15)) - 200n;
  return estimate > floor ? estimate : floor;
}

export type SentLog = { id: bigint; from: Address; to: Address; amount: bigint; message: string; txHash: `0x${string}`; blockNumber: bigint };
export type SettledLog = { id: bigint; by: Address; status: number; reply: string; txHash: `0x${string}`; blockNumber: bigint };

type FetchArgs = { client: PublicClient; address: Address; startBlock: bigint };

export async function fetchSentLogs(
  { client, address, startBlock }: FetchArgs,
  filter: { ids?: bigint[]; to?: Address; from?: Address },
  earliestSentAt?: bigint,
): Promise<SentLog[]> {
  const fromBlock = earliestSentAt !== undefined ? await estimateBlockAt(client, earliestSentAt, startBlock) : startBlock;
  const args: Record<string, unknown> = {};
  if (filter.ids?.length) args.id = filter.ids;
  if (filter.to) args.to = filter.to;
  if (filter.from) args.from = filter.from;
  let logs = await scanLogs({ client, address, event: sentEvent, args, fromBlock, ids: filter.ids });

  // The estimate can miss when block times drift; fall back to a full scan for anything not found.
  if (filter.ids?.length && fromBlock > startBlock) {
    const found = new Set(logs.map((l) => (l.args as { id: bigint }).id));
    const missing = filter.ids.filter((id) => !found.has(id));
    if (missing.length) {
      const extra = await scanLogs({ client, address, event: sentEvent, args: { id: missing }, fromBlock: startBlock, toBlock: fromBlock - 1n, ids: missing });
      logs = [...extra, ...logs];
    }
  }
  return logs.map((l) => {
    const a = l.args as { id: bigint; from: Address; to: Address; amount: bigint; message: string };
    return { ...a, txHash: l.transactionHash!, blockNumber: l.blockNumber! };
  });
}

export async function fetchSettledLogs(
  { client, address, startBlock }: FetchArgs,
  ids: bigint[],
  earliestSentAt?: bigint,
): Promise<SettledLog[]> {
  if (!ids.length) return [];
  const fromBlock = earliestSentAt !== undefined ? await estimateBlockAt(client, earliestSentAt, startBlock) : startBlock;
  const logs = await scanLogs({ client, address, event: settledEvent, args: { id: ids }, fromBlock, ids });
  return logs.map((l) => {
    const a = l.args as { id: bigint; by: Address; status: number; reply: string };
    return { ...a, txHash: l.transactionHash!, blockNumber: l.blockNumber! };
  });
}
