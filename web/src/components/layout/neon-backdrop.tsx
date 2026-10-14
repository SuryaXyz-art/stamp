import type { CSSProperties } from "react";

// Decorative, fixed behind every page. Back to front: a deep gradient sky, a slowly turning neon light sweep,
// drifting aurora, twinkling stars, envelopes flying along dashed delivery routes, postmarks, USDC coins and
// postage stamps floating up. Pure CSS + SVG (no client JS); styles and motion live in globals.css under
// "Animated backdrop". Everything here is deterministic, so server and client markup always match.

type Tone = "magenta" | "cyan" | "violet" | "lime" | "amber";

// x: left edge (vw) · w: width (px) · dur: seconds per trip · at: start phase 0–1 · r0/r1: rotation (deg)
// · dx: sideways drift (px) · rest: resting height (vh) when motion is reduced · sm: hidden on phones.
const STAMPS: { x: number; w: number; dur: number; at: number; r0: number; r1: number; dx: number; rest: number; tone: Tone; label: string; sm?: boolean }[] = [
  { x: 4, w: 54, dur: 46, at: 0.1, r0: -12, r1: 8, dx: 40, rest: 70, tone: "magenta", label: "$1" },
  { x: 14, w: 38, dur: 38, at: 0.62, r0: 10, r1: -6, dx: -30, rest: 22, tone: "cyan", label: "USDC", sm: true },
  { x: 24, w: 46, dur: 52, at: 0.35, r0: -4, r1: 14, dx: 50, rest: 84, tone: "violet", label: "$0.25", sm: true },
  { x: 37, w: 34, dur: 41, at: 0.85, r0: 16, r1: -10, dx: -40, rest: 12, tone: "lime", label: "ARC" },
  { x: 48, w: 50, dur: 57, at: 0.5, r0: -8, r1: 6, dx: 30, rest: 58, tone: "amber", label: "$5", sm: true },
  { x: 58, w: 40, dur: 44, at: 0.18, r0: 6, r1: -14, dx: -50, rest: 36, tone: "magenta", label: "$0.10", sm: true },
  { x: 67, w: 58, dur: 60, at: 0.72, r0: -14, r1: 4, dx: 40, rest: 76, tone: "cyan", label: "$2" },
  { x: 77, w: 36, dur: 39, at: 0.4, r0: 12, r1: -8, dx: -30, rest: 18, tone: "violet", label: "REFUND", sm: true },
  { x: 86, w: 48, dur: 50, at: 0.92, r0: -6, r1: 12, dx: -45, rest: 48, tone: "lime", label: "$1" },
  { x: 93, w: 32, dur: 36, at: 0.28, r0: 18, r1: -4, dx: -25, rest: 88, tone: "magenta", label: "USDC", sm: true },
];

// USDC coins: smaller, faster, and they fade out as they rise (a refund floating home).
const COINS: { x: number; size: number; dur: number; at: number; dx: number; rest: number; sm?: boolean }[] = [
  { x: 9, size: 18, dur: 22, at: 0.3, dx: 20, rest: 40 },
  { x: 31, size: 14, dur: 18, at: 0.75, dx: -15, rest: 64, sm: true },
  { x: 53, size: 20, dur: 26, at: 0.05, dx: 25, rest: 26, sm: true },
  { x: 72, size: 16, dur: 20, at: 0.55, dx: -20, rest: 68 },
  { x: 89, size: 22, dur: 28, at: 0.9, dx: 15, rest: 30, sm: true },
];

// Delivery routes in a 1440×900 scene that covers the viewport (slice). Each carries one envelope.
const ROUTES: { d: string; dur: number; begin: number; tone: Tone; sm?: boolean }[] = [
  { d: "M -80 720 C 300 520, 560 760, 860 480 S 1300 180, 1540 260", dur: 16, begin: 0, tone: "cyan" },
  { d: "M -80 200 C 260 80, 520 340, 820 260 S 1220 60, 1540 140", dur: 21, begin: -7, tone: "magenta", sm: true },
  { d: "M 1540 820 C 1180 700, 980 860, 680 700 S 220 560, -80 640", dur: 24, begin: -15, tone: "violet", sm: true },
];

// A small deterministic PRNG, so the starfield is identical on every render.
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

/** One element, many box-shadows: a whole layer of stars for the price of a single node. */
function starShadows(count: number, seed: number, tones: string[]) {
  const r = rng(seed);
  return Array.from({ length: count }, () => {
    const x = (r() * 100).toFixed(2);
    const y = (r() * 100).toFixed(2);
    const tone = tones[Math.floor(r() * tones.length)];
    return `${x}vw ${y}vh 0 0 ${tone}`;
  }).join(", ");
}

const STARS_NEAR = starShadows(28, 7, ["var(--cyan)", "var(--magenta)", "var(--foreground)"]);
const STARS_FAR = starShadows(46, 42, ["var(--violet)", "var(--foreground)", "var(--cyan)"]);

const css = (vars: Record<string, string | number>) => vars as CSSProperties;

/** A round postmark: double ring, text around the rim and three cancellation waves. */
function Postmark({ id, text, className = "", style }: { id: string; text: string; className?: string; style: CSSProperties }) {
  return (
    <svg viewBox="0 0 200 200" className={`bd-postmark ${className}`} style={style}>
      <defs>
        <path id={id} d="M100,100 m-74,0 a74,74 0 1,1 148,0 a74,74 0 1,1 -148,0" />
      </defs>
      <circle cx="100" cy="100" r="92" fill="none" strokeWidth="2" />
      <circle cx="100" cy="100" r="58" fill="none" strokeWidth="1.5" strokeDasharray="4 6" />
      <text fontSize="13">
        {/* Spread one copy of the text evenly around the whole rim (2π·74 ≈ 465). */}
        <textPath href={`#${id}`} textLength="460" lengthAdjust="spacing">
          {text}
        </textPath>
      </text>
      <path d="M62,88 q9.5,-8 19,0 t19,0 t19,0 t19,0 M62,100 q9.5,-8 19,0 t19,0 t19,0 t19,0 M62,112 q9.5,-8 19,0 t19,0 t19,0 t19,0" fill="none" strokeWidth="2" />
    </svg>
  );
}

/** Dashed delivery routes with a glowing envelope flying along each one (SVG animateMotion). */
function Routes() {
  return (
    <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" className="bd-routes">
      {ROUTES.map((route, i) => (
        <g key={i} className={`bd-route${route.sm ? " max-sm:hidden" : ""}`} style={css({ "--tone": `var(--${route.tone})` })}>
          {/* Per route: a gradient's currentColor comes from where it's defined, not where it's used. */}
          <radialGradient id={`bd-env-glow-${i}`}>
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.55" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
          <path id={`bd-route-${i}`} d={route.d} className="bd-route-path" />
          <g className="bd-envelope">
            <circle r="34" fill={`url(#bd-env-glow-${i})`} />
            <rect x="-15" y="-10" width="30" height="20" rx="2.5" className="bd-envelope-body" />
            <path d="M -15 -10 L 0 2 L 15 -10" className="bd-envelope-flap" />
            <animateMotion dur={`${route.dur}s`} begin={`${route.begin}s`} repeatCount="indefinite" rotate="auto">
              <mpath href={`#bd-route-${i}`} />
            </animateMotion>
          </g>
        </g>
      ))}
    </svg>
  );
}

export function NeonBackdrop() {
  return (
    <div aria-hidden="true" className="neon-backdrop">
      <div className="bd-sky" />
      <div className="bd-sweep" />
      <div className="bd-aurora bd-aurora-a" />
      <div className="bd-aurora bd-aurora-b" />
      <div className="bd-aurora bd-aurora-c" />

      <div className="bd-stars bd-stars-far" style={{ boxShadow: STARS_FAR }} />
      <div className="bd-stars bd-stars-near" style={{ boxShadow: STARS_NEAR }} />

      <Routes />

      <Postmark id="bd-pm-a" text="STAMP · ARC MAINNET · REFUNDABLE · " style={css({ "--pm-x": "74vw", "--pm-y": "12vh", "--pm-size": "220px", "--pm-dur": "90s", "--tone": "var(--cyan)" })} />
      <Postmark id="bd-pm-b" text="PAID INBOX · USDC · DELIVERED · " className="max-sm:hidden" style={css({ "--pm-x": "5vw", "--pm-y": "60vh", "--pm-size": "170px", "--pm-dur": "120s", "--tone": "var(--magenta)" })} />

      {COINS.map((c, i) => (
        <div
          key={i}
          className={`bd-coin${c.sm ? " max-sm:hidden" : ""}`}
          style={css({
            "--x": `${c.x}vw`,
            "--size": `${c.size}px`,
            "--dur": `${c.dur}s`,
            "--delay": `${-(c.dur * c.at).toFixed(1)}s`,
            "--dx": `${c.dx}px`,
            "--rest": `${c.rest}vh`,
          })}
        >
          $
        </div>
      ))}

      {STAMPS.map((s, i) => (
        <div
          key={i}
          className={`bd-stamp${s.sm ? " max-sm:hidden" : ""}`}
          style={css({
            "--x": `${s.x}vw`,
            "--w": `${s.w}px`,
            "--dur": `${s.dur}s`,
            "--delay": `${-(s.dur * s.at).toFixed(1)}s`,
            "--r0": `${s.r0}deg`,
            "--r1": `${s.r1}deg`,
            "--dx": `${s.dx}px`,
            "--rest": `${s.rest}vh`,
            "--tone": `var(--${s.tone})`,
          })}
        >
          <span className="bd-stamp-label">{s.label}</span>
        </div>
      ))}

      <div className="bd-vignette" />
    </div>
  );
}
