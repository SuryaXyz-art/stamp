import { describe, expect, it } from "vitest";
import { byteLength, formatCountdown, formatStampPrice, formatUsdc, parseUsdc, shortAddress } from "./format";

const usdc = (n: string) => parseUsdc(n)!;

describe("money", () => {
  it("treats native USDC as 18 decimals", () => {
    expect(parseUsdc("1")).toBe(10n ** 18n);
    expect(parseUsdc("$0.25")).toBe(25n * 10n ** 16n);
    expect(parseUsdc("1,000")).toBe(1000n * 10n ** 18n);
  });

  it("rejects junk input", () => {
    for (const bad of ["", "abc", "1.2.3", "-1", "1e5"]) expect(parseUsdc(bad)).toBeUndefined();
  });

  it("formats dollars, never raw wei", () => {
    expect(formatUsdc(usdc("1"))).toBe("$1.00");
    expect(formatUsdc(usdc("1"), { suffix: true })).toBe("$1.00 USDC");
    expect(formatUsdc(usdc("0.001"))).toBe("$0.0010");
    expect(formatUsdc(undefined)).toBe("—");
    expect(formatStampPrice(usdc("5"))).toBe("$5");
    expect(formatStampPrice(usdc("0.25"))).toBe("$0.25");
  });
});

describe("text", () => {
  it("counts bytes the way the contract does", () => {
    expect(byteLength("hi")).toBe(2);
    expect(byteLength("é")).toBe(2);
    expect(byteLength("👋")).toBe(4);
  });

  it("shortens addresses and countdowns", () => {
    expect(shortAddress("0x448C8cAB90a6aaCa0692cEBCDDCD06D3cA15d24B")).toBe("0x448C…d24B");
    expect(formatCountdown(6 * 86400 + 23 * 3600 + 5)).toBe("6d 23h");
    expect(formatCountdown(65)).toBe("1m 5s");
    expect(formatCountdown(-3)).toBe("0s");
  });
});
