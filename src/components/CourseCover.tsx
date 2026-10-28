/* A course's cover: soft abstract shapes in the theme's light, laid out from the course code.
   The same course always gets the same cover; different courses get different ones. No images to download. */

const hash = (s: string) => {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
};

/** Four compositions, so neighbouring courses don't look alike. */
const LAYOUTS = ['orbit', 'stack', 'arc', 'grid'] as const;

export function CourseCover({ code, className = '' }: { code: string; className?: string }) {
  const h = hash(code.toUpperCase());
  const layout = LAYOUTS[h % LAYOUTS.length];
  const r = (n: number, min: number, max: number) => min + (((h >>> (n * 3)) & 1023) / 1023) * (max - min);
  const glow = 'var(--color-glow)';
  const acc = 'var(--color-accent)';
  const tint = (c: string, pct: number, to = 'transparent') => `color-mix(in srgb, ${c} ${pct}%, ${to})`;
  const rot = r(1, -25, 25);

  return (
    <div aria-hidden className={`pointer-events-none relative overflow-hidden ${className}`} style={{ background: `linear-gradient(${135 + rot}deg, ${tint(glow, 55, 'var(--color-raised)')}, ${tint(glow, 18, 'var(--color-surface)')})` }}>
      <svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id={`s${h}`} cx="0.35" cy="0.3" r="0.7">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>
        {layout === 'orbit' && (
          <g transform={`rotate(${rot} 100 60)`}>
            <circle cx={r(2, 120, 150)} cy={r(3, 40, 70)} r="46" style={{ fill: tint(glow, 70, '#000') }} />
            <circle cx={r(2, 120, 150)} cy={r(3, 40, 70)} r="46" fill={`url(#s${h})`} />
            <ellipse cx="100" cy="62" rx="92" ry="22" fill="none" style={{ stroke: tint('#ffffff', 35) }} strokeWidth="1.5" />
            <circle cx={r(4, 30, 60)} cy={r(5, 70, 95)} r="9" style={{ fill: acc }} />
          </g>
        )}
        {layout === 'stack' && (
          <g transform={`rotate(${rot / 2} 100 60)`}>
            {[0, 1, 2].map((i) => (
              <rect key={i} x={60 + i * 18} y={22 + i * 14} width="90" height="56" rx="14" style={{ fill: tint(glow, 85 - i * 18, i === 2 ? '#ffffff' : '#000') }} />
            ))}
            <rect x="96" y="50" width="90" height="56" rx="14" fill={`url(#s${h})`} />
            <circle cx="40" cy={r(5, 30, 90)} r="7" style={{ fill: acc }} />
          </g>
        )}
        {layout === 'arc' && (
          <g>
            {[70, 52, 34].map((rad, i) => (
              <path key={rad} d={`M ${150 - rad} 130 A ${rad} ${rad} 0 0 1 ${150 + rad} 130`} fill="none" style={{ stroke: tint(i === 2 ? acc : glow, i === 2 ? 100 : 80 - i * 15, i === 2 ? 'transparent' : '#ffffff') }} strokeWidth="14" strokeLinecap="round" />
            ))}
            <circle cx={r(4, 30, 70)} cy={r(5, 25, 55)} r="20" style={{ fill: tint(glow, 60, '#000') }} />
            <circle cx={r(4, 30, 70)} cy={r(5, 25, 55)} r="20" fill={`url(#s${h})`} />
          </g>
        )}
        {layout === 'grid' && (
          <g transform={`rotate(${rot} 100 60)`}>
            {Array.from({ length: 12 }, (_, i) => {
              const x = 70 + (i % 4) * 30, y = 6 + Math.floor(i / 4) * 38;
              const on = ((h >>> i) & 1) === 1;
              return <rect key={i} x={x} y={y} width="24" height="32" rx="12" style={{ fill: on ? tint(glow, 80, '#000') : tint('#ffffff', 20) }} />;
            })}
            <rect x={70 + ((h >>> 3) % 4) * 30} y={6 + ((h >>> 5) % 3) * 38} width="24" height="32" rx="12" style={{ fill: acc }} />
          </g>
        )}
      </svg>
    </div>
  );
}
