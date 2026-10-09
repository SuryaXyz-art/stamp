import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * WCAG 2.2 AA contrast for the Neon Postal tokens, read straight from globals.css so the test can't drift
 * from the theme. Text needs 4.5:1; control boundaries and focus rings need 3:1 (SC 1.4.11).
 */

const css = readFileSync(join(__dirname, "..", "app", "globals.css"), "utf8");

function tokens(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`no ${selector} block`);
  const block = css.slice(start, css.indexOf("\n}", start));
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) out[m[1]] = m[2].toLowerCase();
  return out;
}

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (c: number[]) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
/** `amount` of `top` over `base`, like color-mix(in srgb, top amount%, base). */
const mix = (top: string, amount: number, base: string) => toHex(rgb(top).map((v, i) => v * amount + rgb(base)[i] * (1 - amount)));

function luminance(hex: string) {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const themes = { light: tokens(":root"), dark: tokens(".dark") };
const INKS = ["foreground", "muted-foreground", "magenta-ink", "cyan-ink", "lime-ink", "violet-ink", "amber-ink"];
const SURFACES = ["background", "card", "muted"];

describe.each(Object.entries(themes))("%s theme", (_name, t) => {
  it("defines every token the checks need", () => {
    for (const k of [...INKS, ...SURFACES, "primary", "primary-foreground", "input", "ring", "magenta", "lime", "amber"]) {
      expect(t[k], k).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it.each(INKS.flatMap((ink) => SURFACES.map((s) => [ink, s])))("text %s on %s is at least 4.5:1", (ink, surface) => {
    expect(contrast(t[ink], t[surface])).toBeGreaterThanOrEqual(4.5);
  });

  it("primary button text is at least 4.5:1", () => {
    expect(contrast(t["primary-foreground"], t.primary)).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ["magenta-ink", "magenta", 0.1], // destructive / spam buttons
    ["magenta-ink", "magenta", 0.15], // active price chip, current setup step
    ["lime-ink", "lime", 0.05], // reply boxes
    ["amber-ink", "amber", 0.1], // warnings
  ] as const)("%s on a %s tint (%s) over the card is at least 4.5:1", (ink, tint, amount) => {
    expect(contrast(t[ink], mix(t[tint], amount, t.card))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(SURFACES)("input borders and the focus ring are at least 3:1 on %s", (surface) => {
    expect(contrast(t.input, t[surface])).toBeGreaterThanOrEqual(3);
    expect(contrast(t.ring, t[surface])).toBeGreaterThanOrEqual(3);
  });
});
