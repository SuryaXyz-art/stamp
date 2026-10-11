/**
 * The "Message me on Stamp" badge: a self-contained SVG (no fonts, scripts or external images) so it renders
 * anywhere an <img> does, including GitHub READMEs through their image proxy.
 */

export type BadgeTheme = "dark" | "light";

const THEMES = {
  dark: { label: "#FF2BD6", labelText: "#07060B", value: "#120E1F", valueText: "#F1EEFF", stroke: "#3A2F5C" },
  light: { label: "#C2129E", labelText: "#FFFFFF", value: "#FFFFFF", valueText: "#120E1F", stroke: "#C9C2F0" },
} as const;

/** Rough Verdana 11px advance widths; enough to size the pill without a font engine. */
function textWidth(s: string): number {
  let w = 0;
  for (const ch of s) {
    if (ch === " ") w += 3.9;
    else if (/[.,:;'!|ilj·]/.test(ch)) w += 3.6;
    else if (/[A-Z0-9$@#%&mw]/.test(ch)) w += 7.6;
    else w += 6.6;
  }
  return Math.ceil(w);
}

const escapeXml = (s: string) =>
  s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!);

export function badgeSvg({ value, theme = "dark" }: { value: string; theme?: BadgeTheme }): string {
  const t = THEMES[theme];
  const label = "STAMP";
  const pad = 10;
  const icon = 14;
  const lw = pad + icon + 5 + textWidth(label) + pad;
  const vw = pad + textWidth(value) + pad;
  const w = lw + vw;
  const h = 24;
  const v = escapeXml(value);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}: ${v}">
<title>${label}: ${v}</title>
<clipPath id="r"><rect width="${w}" height="${h}" rx="6"/></clipPath>
<g clip-path="url(#r)">
<rect width="${lw}" height="${h}" fill="${t.label}"/>
<rect x="${lw}" width="${vw}" height="${h}" fill="${t.value}"/>
</g>
<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="5.5" fill="none" stroke="${t.stroke}"/>
<g transform="translate(${pad} 5)" fill="none" stroke="${t.labelText}" stroke-width="1.4">
<rect x="0.7" y="0.7" width="12.6" height="12.6" rx="1.5" stroke-dasharray="2 1.4"/>
<path d="M7 3.6v6.8M8.8 5.1c-.3-.6-1-.9-1.8-.9-1 0-1.8.5-1.8 1.3 0 1.8 3.7.9 3.7 2.7 0 .8-.8 1.4-1.9 1.4-.9 0-1.6-.4-1.9-1" stroke-linecap="round"/>
</g>
<g font-family="Verdana,DejaVu Sans,Geneva,sans-serif" font-size="11" font-weight="700">
<text x="${pad + icon + 5}" y="16" fill="${t.labelText}" letter-spacing=".6">${label}</text>
<text x="${lw + pad}" y="16" fill="${t.valueText}" font-weight="400">${v}</text>
</g>
</svg>`;
}
