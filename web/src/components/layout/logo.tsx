export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <svg width="26" height="30" viewBox="0 0 26 30" aria-hidden="true" className="-rotate-6">
        <defs>
          <mask id="logo-perf">
            <rect width="26" height="30" fill="white" />
            {[0, 6.5, 13, 19.5, 26].map((x) => [<circle key={`t${x}`} cx={x} cy={0} r={1.8} />, <circle key={`b${x}`} cx={x} cy={30} r={1.8} />])}
            {[6, 12, 18, 24].map((y) => [<circle key={`l${y}`} cx={0} cy={y} r={1.8} />, <circle key={`r${y}`} cx={26} cy={y} r={1.8} />])}
          </mask>
        </defs>
        <g mask="url(#logo-perf)">
          <rect width="26" height="30" fill="var(--card)" />
          <rect x="3" y="3" width="20" height="24" rx="1.5" fill="var(--stamp)" />
        </g>
        <text x="13" y="20" textAnchor="middle" fontSize="12" fontFamily="var(--font-serif)" fill="white">
          $
        </text>
      </svg>
      <span className="font-serif text-2xl leading-none tracking-tight">Stamp</span>
    </span>
  );
}
