/* Grove themes. One accent per theme; every theme is applied by setting CSS variables on <html>,
   so Tailwind utilities (bg-bg, text-muted, text-emerald-400 ...) re-colour without touching components. */

export interface Theme {
  id: string;
  name: string;
  mode: 'dark' | 'light';
  bg: string;
  side: string;
  surface: string;
  raised: string;
  line: string;
  text: string;
  muted: string;
  accent: string;
  onAccent: string; // text on top of a solid accent button
  warn: string;
  /** Colour of the ambient light behind the panels. Defaults to the accent. */
  glow?: string;
}

export const THEMES: Theme[] = [
  // From the studio references: cobalt with white pills; fog glass with ink pills; graphite with a citron spark.
  { id: 'forma', name: 'Cobalt', mode: 'dark', bg: '#081747', side: '#06123a', surface: '#0e2163', raised: '#16307f', line: '#1e3888', text: '#f1f4ff', muted: '#aab7e4', accent: '#f3f6ff', onAccent: '#0c2266', warn: '#f5c451', glow: '#2d5bff' },
  { id: 'fog', name: 'Fog', mode: 'light', bg: '#e6e9ed', side: '#f3f4f6', surface: '#f8f9fa', raised: '#e2e5ea', line: '#d0d5dc', text: '#15171b', muted: '#575e69', accent: '#15171b', onAccent: '#f8f9fa', warn: '#b45309', glow: '#8ea6c2' },
  { id: 'graphite', name: 'Graphite', mode: 'dark', bg: '#111214', side: '#0c0d0e', surface: '#1a1b1e', raised: '#25272a', line: '#323438', text: '#f1f1ee', muted: '#a09f99', accent: '#e4ef4c', onAccent: '#171a05', warn: '#f0a24a', glow: '#b89a62' },
  { id: 'grove', name: 'Grove', mode: 'dark', bg: '#0e1512', side: '#0b110e', surface: '#151f1a', raised: '#1b2b24', line: '#26352d', text: '#e5ede7', muted: '#92a59a', accent: '#5fc2a2', onAccent: '#08140f', warn: '#e0a94a' },
  { id: 'midnight', name: 'Midnight', mode: 'dark', bg: '#0b1220', side: '#080e19', surface: '#111a2c', raised: '#18243b', line: '#27375a', text: '#e6ecf7', muted: '#93a3c0', accent: '#6cb0f5', onAccent: '#06121f', warn: '#e0a94a' },
  { id: 'cobalt-day', name: 'Cobalt Day', mode: 'light', bg: '#f4f7fc', side: '#ffffff', surface: '#ffffff', raised: '#e8eef9', line: '#d3dcee', text: '#0f1b33', muted: '#52607d', accent: '#1d4ed8', onAccent: '#ffffff', warn: '#b45309' },
  { id: 'burgundy-noir', name: 'Burgundy', mode: 'dark', bg: '#0c0a0b', side: '#080607', surface: '#151012', raised: '#21171b', line: '#38272d', text: '#f0e8ea', muted: '#aa969d', accent: '#d9506f', onAccent: '#180509', warn: '#e0a94a' },
  { id: 'rosewood-day', name: 'Rosewood', mode: 'light', bg: '#faf7f8', side: '#ffffff', surface: '#ffffff', raised: '#f5e9ed', line: '#e5d4da', text: '#24121a', muted: '#6d5560', accent: '#8c1c3b', onAccent: '#ffffff', warn: '#a15c07' },
  { id: 'grove-day', name: 'Meadow', mode: 'light', bg: '#f3f8f5', side: '#ffffff', surface: '#ffffff', raised: '#e5f1ea', line: '#cfe0d6', text: '#10241b', muted: '#506a5d', accent: '#17755a', onAccent: '#ffffff', warn: '#a15c07' },
];

const KEY = 'grove_theme_v1';
export const DEFAULT_THEME = 'forma';

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const x = hex(a), y = hex(b);
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
};

export function getStoredTheme(): string {
  try {
    const id = localStorage.getItem(KEY);
    if (id && THEMES.some((t) => t.id === id)) return id;
  } catch { /* storage can be unavailable */ }
  return DEFAULT_THEME;
}

/** Palette handed to the HyperFrames compositions (they live in sandboxed iframes). */
export function visualPalette(t: Theme) {
  const dark = t.mode === 'dark';
  return {
    bg: t.bg,
    panel: dark ? mix(t.surface, t.bg, 0.45) : mix(t.surface, t.raised, 0.35),
    surface: t.surface,
    raised: t.raised,
    lo: dark ? mix(t.line, t.muted, 0.18) : mix(t.line, t.muted, 0.45),
    line: t.line,
    tx: t.text,
    mu: t.muted,
    dim: mix(t.muted, t.bg, 0.5),
    hi: t.accent,
    hibg: mix(t.bg, t.accent, dark ? 0.28 : 0.14),
    warn: t.warn,
    warnbg: mix(t.bg, t.warn, dark ? 0.22 : 0.14),
    ink: t.onAccent,
    dark: dark ? 1 : 0,
  };
}

export function themeById(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export function applyTheme(id: string, persist = true): void {
  const t = themeById(id);
  const dark = t.mode === 'dark';
  const s = document.documentElement.style;
  const set = (k: string, v: string) => s.setProperty(k, v);

  set('color-scheme', t.mode);
  set('--color-bg', t.bg);
  set('--color-side', t.side);
  set('--color-surface', t.surface);
  set('--color-raised', t.raised);
  set('--color-line', t.line);
  set('--color-text', t.text);
  set('--color-muted', t.muted);
  set('--color-accent', t.accent);
  set('--color-accent-strong', t.accent);
  set('--color-ink', t.onAccent);
  set('--color-on-accent', t.onAccent);
  set('--color-warn', t.warn);
  set('--color-glow', t.glow ?? t.accent);

  // Legacy slate-* classes: 950 is the deepest surface, 100 the strongest text.
  const ramp = dark
    ? { 950: t.side, 900: t.surface, 800: t.raised, 700: t.line, 600: mix(t.line, t.muted, 0.4), 500: mix(t.line, t.muted, 0.75), 400: t.muted, 300: mix(t.muted, t.text, 0.5), 200: mix(t.muted, t.text, 0.8), 100: t.text }
    : { 950: t.bg, 900: t.surface, 800: t.raised, 700: t.line, 600: mix(t.line, t.muted, 0.5), 500: mix(t.muted, t.bg, 0.15), 400: t.muted, 300: mix(t.muted, t.text, 0.45), 200: mix(t.muted, t.text, 0.75), 100: t.text };
  Object.entries(ramp).forEach(([k, v]) => set(`--color-slate-${k}`, v));

  // emerald-* and teal-* are the accent ramp (the app was written against them)
  const acc = dark
    ? { 300: mix(t.accent, '#ffffff', 0.35), 400: t.accent, 500: t.accent, 600: mix(t.accent, t.bg, 0.12), 800: mix(t.accent, t.bg, 0.72), 950: mix(t.accent, t.bg, 0.88) }
    : { 300: mix(t.accent, '#000000', 0.25), 400: mix(t.accent, '#000000', 0.08), 500: t.accent, 600: mix(t.accent, '#000000', 0.15), 800: mix(t.accent, t.bg, 0.82), 950: mix(t.accent, t.bg, 0.9) };
  Object.entries(acc).forEach(([k, v]) => {
    set(`--color-emerald-${k}`, v);
    set(`--color-teal-${k}`, v);
  });

  // status colours need darker shades on light backgrounds to keep contrast
  const status: Record<string, [string, string]> = { amber: ['#fcd34d', '#fbbf24'], rose: ['#fda4af', '#fb7185'], blue: ['#93c5fd', '#60a5fa'], purple: ['#d8b4fe', '#c084fc'] };
  Object.entries(status).forEach(([name, [c300, c400]]) => {
    if (dark) {
      s.removeProperty(`--color-${name}-300`);
      s.removeProperty(`--color-${name}-400`);
    } else {
      set(`--color-${name}-300`, mix(c300, '#000000', 0.55));
      set(`--color-${name}-400`, mix(c400, '#000000', 0.42));
    }
  });

  document.documentElement.dataset.theme = t.id;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.bg);
  window.dispatchEvent(new CustomEvent('grove-theme-changed', { detail: t.id }));
  if (persist) {
    try { localStorage.setItem(KEY, t.id); } catch { /* ignore */ }
  }
}
