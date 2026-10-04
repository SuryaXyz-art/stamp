import { formatEther, parseEther } from "viem";

/** Native USDC on Arc has 18 decimals. `formatUsdc(10n ** 18n)` -> "$1.00". Never shows raw wei. */
export function formatUsdc(wei: bigint | undefined, { suffix = false }: { suffix?: boolean } = {}): string {
  if (wei === undefined) return "—";
  const n = Number(formatEther(wei));
  const digits = n !== 0 && Math.abs(n) < 0.01 ? 4 : 2;
  const s = n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return suffix ? `${s} USDC` : s;
}

/** "$1" for whole dollars, "$0.25" otherwise. Used on stamps where space is tight. */
export function formatStampPrice(wei: bigint | undefined): string {
  if (wei === undefined) return "—";
  const n = Number(formatEther(wei));
  return Number.isInteger(n) ? `$${n.toLocaleString("en-US")}` : formatUsdc(wei);
}

/** Parses a user-typed dollar amount ("1", "0.25", "$5") into 18-decimal wei. */
export function parseUsdc(input: string): bigint | undefined {
  const clean = input.replace(/[$,\s]/g, "");
  if (!/^\d*\.?\d+$/.test(clean)) return undefined;
  try {
    return parseEther(clean);
  } catch {
    return undefined;
  }
}

export function shortAddress(address: string, chars = 4): string {
  return `${address.slice(0, 2 + chars)}…${address.slice(-chars)}`;
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function timeAgo(unixSeconds: number | bigint, now = Date.now()): string {
  const diff = Number(unixSeconds) - now / 1000;
  const abs = Math.abs(diff);
  if (abs < 45) return "just now";
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["minute", 60],
    ["hour", 3600],
    ["day", 86400],
    ["week", 604800],
    ["month", 2629800],
    ["year", 31557600],
  ];
  let unit = units[0];
  for (const u of units) if (abs >= u[1]) unit = u;
  return rtf.format(Math.round(diff / unit[1]), unit[0]);
}

/** "6d 23h", "4h 12m", "38s" — for the reclaim countdown. */
export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}
