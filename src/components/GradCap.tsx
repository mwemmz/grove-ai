/* The graduation cap: Grove's finish line, drawn in the theme's own light.
   Today it is drawn in code. To use a photographic render instead, put the image in /public and set CAP_IMAGE:
   it is shown in greyscale and tinted with the theme glow, so one image works for every theme. */
import { useId } from 'react';

const CAP_IMAGE: string | null = null; // e.g. '/cap.png' (transparent background, cap centred)

const mixc = (a: string, b: string, pct: number) => `color-mix(in srgb, ${a} ${pct}%, ${b})`;

export function GradCap({ className = '', still = false }: { className?: string; still?: boolean }) {
  const id = useId().replace(/:/g, '');
  const g = (n: string) => `${n}-${id}`;
  const glow = 'var(--color-glow)';
  const tassel = 'var(--color-accent)';

  return (
    <div aria-hidden className={`pointer-events-none relative ${className}`}>
      {/* The studio light behind the object, and its shadow on the floor. */}
      <div className="absolute inset-[8%] rounded-full blur-2xl" style={{ background: `radial-gradient(closest-side, ${mixc(glow, 'transparent', 55)}, transparent)` }} />
      <div className={`cap-shadow absolute bottom-[4%] left-1/2 h-[9%] w-[58%] -translate-x-1/2 rounded-[50%] ${still ? '' : 'cap-shadow-anim'}`} style={{ background: 'radial-gradient(closest-side, rgb(0 0 0 / 0.45), transparent)' }} />

      <div className={`relative ${still ? '' : 'cap-float'}`}>
        {CAP_IMAGE ? (
          <span className="relative block">
            <img src={CAP_IMAGE} alt="" className="block w-full" style={{ filter: 'grayscale(1) contrast(1.1)' }} />
            <span className="absolute inset-0" style={{ background: glow, mixBlendMode: 'color', WebkitMaskImage: `url(${CAP_IMAGE})`, maskImage: `url(${CAP_IMAGE})`, WebkitMaskSize: '100% 100%', maskSize: '100% 100%' }} />
          </span>
        ) : (
          <svg viewBox="0 0 400 300" className="block w-full overflow-visible">
            <defs>
              <linearGradient id={g('top')} x1="0.15" y1="0" x2="0.85" y2="1">
                <stop offset="0" style={{ stopColor: mixc(glow, '#ffffff', 62) }} />
                <stop offset="0.55" style={{ stopColor: mixc(glow, '#000000', 72) }} />
                <stop offset="1" style={{ stopColor: mixc(glow, '#000000', 42) }} />
              </linearGradient>
              <linearGradient id={g('edge')} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" style={{ stopColor: mixc(glow, '#000000', 34) }} />
                <stop offset="0.5" style={{ stopColor: mixc(glow, '#000000', 52) }} />
                <stop offset="1" style={{ stopColor: mixc(glow, '#000000', 26) }} />
              </linearGradient>
              <linearGradient id={g('skull')} x1="0" y1="0" x2="1" y2="0.2">
                <stop offset="0" style={{ stopColor: mixc(glow, '#000000', 30) }} />
                <stop offset="0.45" style={{ stopColor: mixc(glow, '#000000', 62) }} />
                <stop offset="0.8" style={{ stopColor: mixc(glow, '#ffffff', 82) }} />
                <stop offset="1" style={{ stopColor: mixc(glow, '#000000', 44) }} />
              </linearGradient>
              <linearGradient id={g('tassel')} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" style={{ stopColor: mixc(tassel, '#000000', 70) }} />
                <stop offset="0.5" style={{ stopColor: tassel }} />
                <stop offset="1" style={{ stopColor: mixc(tassel, '#000000', 60) }} />
              </linearGradient>
              <radialGradient id={g('sheen')} cx="0.32" cy="0.3" r="0.55">
                <stop offset="0" stopColor="#ffffff" stopOpacity="0.35" />
                <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* skull cap */}
            <path d="M98 122 L98 196 Q200 250 302 196 L302 122 Q200 168 98 122 Z" fill={`url(#${g('skull')})`} />
            <path d="M98 196 Q200 250 302 196" fill="none" stroke="#000" strokeOpacity="0.25" strokeWidth="2" />
            {/* board: its thickness, then the top face and a soft sheen */}
            <path d="M28 96 L200 152 L372 96 L372 108 L200 165 L28 108 Z" fill={`url(#${g('edge')})`} />
            <path d="M200 38 L372 96 L200 152 L28 96 Z" fill={`url(#${g('top')})`} />
            <path d="M200 38 L372 96 L200 152 L28 96 Z" fill={`url(#${g('sheen')})`} />
            <path d="M28 96 L200 38 L372 96" fill="none" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="2" />
            <path d="M28 108 L200 165 L372 108" fill="none" stroke="#ffffff" strokeOpacity="0.22" strokeWidth="1.5" />
            <path d="M98 196 Q200 250 302 196" fill="none" stroke="#ffffff" strokeOpacity="0.18" strokeWidth="1.5" transform="translate(0,2)" />

            {/* button, cord and tassel (the tassel sways on its own) */}
            <ellipse cx="200" cy="95" rx="11" ry="6" style={{ fill: tassel }} />
            <g className={still ? '' : 'cap-tassel'} style={{ transformOrigin: '346px 104px' }}>
              <path d="M200 95 Q282 96 346 104" fill="none" style={{ stroke: tassel }} strokeWidth="4" strokeLinecap="round" />
              <path d="M346 104 L348 178" fill="none" style={{ stroke: tassel }} strokeWidth="4" strokeLinecap="round" />
              <rect x="340" y="174" width="16" height="12" rx="4" style={{ fill: tassel }} />
              <path d="M339 186 L357 186 L362 238 Q348 246 334 238 Z" fill={`url(#${g('tassel')})`} />
              {[338, 343, 348, 353, 358].map((x) => (
                <line key={x} x1={x} y1="192" x2={x + (x - 348) * 0.25} y2="240" stroke="#000" strokeOpacity="0.18" strokeWidth="1" />
              ))}
            </g>
          </svg>
        )}
      </div>
    </div>
  );
}
