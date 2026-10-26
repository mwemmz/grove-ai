/* "Try it yourself" labs under the economics animations: the same graph, but the student moves the numbers.
   Pure SVG, coloured from the theme (currentColor + Tailwind text colours), so it follows every Grove theme. */
import React, { useId, useState } from 'react';
import type { TopicId } from '../data/visualTopics';
import { labelCls, panel } from './ui';

/* ---------------------------------------------------------------- pieces */

interface Axes { xmax: number; ymax: number; xlabel: string; ylabel: string }
const W = 420, H = 316, L = 54, B = 40, T = 34, R = 16;
const pw = W - L - R, ph = H - T - B;

function makeScale(a: Axes) {
  return { x: (v: number) => L + (v / a.xmax) * pw, y: (v: number) => T + ph - (v / a.ymax) * ph };
}

function clipSeg(a: Axes, p: [number, number], q: [number, number]): [[number, number], [number, number]] | null {
  let t0 = 0, t1 = 1;
  const dx = q[0] - p[0], dy = q[1] - p[1];
  const P = [-dx, dx, -dy, dy], Q = [p[0], a.xmax - p[0], p[1], a.ymax - p[1]];
  for (let i = 0; i < 4; i++) {
    if (P[i] === 0) { if (Q[i] < 0) return null; continue; }
    const r = Q[i] / P[i];
    if (P[i] < 0) t0 = Math.max(t0, r); else t1 = Math.min(t1, r);
  }
  if (t0 > t1) return null;
  return [[p[0] + t0 * dx, p[1] + t0 * dy], [p[0] + t1 * dx, p[1] + t1 * dy]];
}

function Plot({ axes, title, children }: { axes: Axes; title: string; children: (s: ReturnType<typeof makeScale>) => React.ReactNode }) {
  const s = makeScale(axes);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full max-w-[520px]" role="img" aria-label={title}>
      <g className="text-muted" stroke="currentColor" strokeWidth={2} fill="none" strokeLinecap="round">
        <path d={`M${L} ${T - 6} V${T + ph} H${L + pw + 8}`} />
      </g>
      <text x={L + pw} y={H - 6} textAnchor="end" className="fill-current text-muted font-mono text-[11px] uppercase tracking-wider">{axes.xlabel}</text>
      <text x={L - 4} y={12} textAnchor="start" className="fill-current text-muted font-mono text-[11px] uppercase tracking-wider">{axes.ylabel}</text>
      {children(s)}
    </svg>
  );
}

function Seg({ axes, s, p, q, tone = 'accent', dash, label }: { axes: Axes; s: ReturnType<typeof makeScale>; p: [number, number]; q: [number, number]; tone?: 'accent' | 'warn' | 'muted' | 'text'; dash?: boolean; label?: string }) {
  const c = clipSeg(axes, p, q);
  if (!c) return null;
  const cls = { accent: 'text-accent', warn: 'text-warn', muted: 'text-muted', text: 'text-text' }[tone];
  return (
    <g className={cls}>
      <line x1={s.x(c[0][0])} y1={s.y(c[0][1])} x2={s.x(c[1][0])} y2={s.y(c[1][1])} stroke="currentColor" strokeWidth={dash ? 1.5 : 3} strokeDasharray={dash ? '5 5' : undefined} strokeLinecap="round" />
      {label &&
        (Math.abs(c[1][0] - c[0][0]) < 1e-9 ? (
          <text x={s.x(c[1][0]) + 6} y={s.y(c[1][1]) + 12} textAnchor="start" className="fill-current font-mono text-[12px] font-semibold">{label}</text>
        ) : (
          <text x={s.x(c[1][0]) - 4} y={s.y(c[1][1]) - 6} textAnchor="end" className="fill-current font-mono text-[12px] font-semibold">{label}</text>
        ))}
    </g>
  );
}

function Dot({ s, x, y, tone = 'accent', xl, yl }: { s: ReturnType<typeof makeScale>; x: number; y: number; tone?: 'accent' | 'warn'; xl?: string; yl?: string }) {
  return (
    <g>
      <line x1={s.x(x)} y1={s.y(y)} x2={s.x(x)} y2={s.y(0)} className="text-muted" stroke="currentColor" strokeDasharray="4 4" strokeWidth={1.2} />
      <line x1={s.x(x)} y1={s.y(y)} x2={s.x(0)} y2={s.y(y)} className="text-muted" stroke="currentColor" strokeDasharray="4 4" strokeWidth={1.2} />
      <circle cx={s.x(x)} cy={s.y(y)} r={6} className={tone === 'warn' ? 'text-warn' : 'text-accent'} fill="currentColor" />
      {xl && <text x={s.x(x)} y={s.y(0) + 15} textAnchor="middle" className="fill-current text-muted font-mono text-[11px]">{xl}</text>}
      {yl && <text x={s.x(0) - 5} y={s.y(y) + 4} textAnchor="end" className="fill-current text-muted font-mono text-[11px]">{yl}</text>}
    </g>
  );
}

export function Slider({ label, value, min, max, step, onChange, fmt }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; fmt?: (v: number) => string }) {
  const id = useId();
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm text-text">{label}</label>
        <span className="font-mono text-sm text-accent">{fmt ? fmt(value) : value}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[var(--color-accent)]" />
    </div>
  );
}

export function Readout({ items }: { items: [string, string][] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs text-muted">{k}</dt>
          <dd className="font-mono text-base text-text">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

const n0 = (v: number) => Math.round(v).toLocaleString('en-US');
const n1 = (v: number) => (Math.round(v * 10) / 10).toLocaleString('en-US');

/* ---------------------------------------------------------------- labs */

function KeynesianLab() {
  const [a, setA] = useState(250), [b, setB] = useState(0.75), [I, setI] = useState(80), [G, setG] = useState(150), [T, setT] = useState(200);
  const auto = a - b * T + I + G;
  const Y = auto / (1 - b);
  const C = a + b * (Y - T);
  const axes: Axes = { xmax: 3000, ymax: 3000, xlabel: 'Income Y', ylabel: 'AE' };
  return (
    <LabShell
      intro="Change the numbers from your Unit 2.2 problem and watch equilibrium income move."
      graph={
        <Plot axes={axes} title={`Keynesian cross: equilibrium income ${n0(Y)}`}>
          {(s) => (
            <>
              <Seg axes={axes} s={s} p={[0, 0]} q={[3000, 3000]} tone="muted" label="45°" />
              <Seg axes={axes} s={s} p={[0, auto]} q={[3000, auto + b * 3000]} label="AE" />
              {Y > 0 && Y < 3000 && <Dot s={s} x={Y} y={Y} xl={n0(Y)} />}
            </>
          )}
        </Plot>
      }
      controls={
        <>
          <Slider label="Autonomous consumption a" value={a} min={0} max={500} step={10} onChange={setA} />
          <Slider label="MPC b" value={b} min={0.5} max={0.9} step={0.05} onChange={setB} fmt={(v) => v.toFixed(2)} />
          <Slider label="Investment I" value={I} min={0} max={400} step={10} onChange={setI} />
          <Slider label="Government spending G" value={G} min={0} max={500} step={10} onChange={setG} />
          <Slider label="Taxes T" value={T} min={0} max={500} step={10} onChange={setT} />
        </>
      }
      readout={[
        ['Equilibrium Y', Y > 0 && Y < 3000 ? n0(Y) : Y >= 3000 ? 'off the chart' : '–'],
        ['Consumption C', n0(C)],
        ['Private saving Y − T − C', n0(Y - T - C)],
        ['Spending multiplier', n1(1 / (1 - b))],
        ['Tax multiplier', '−' + n1(b / (1 - b))],
        ['AE', `${n0(auto)} + ${b.toFixed(2)}Y`],
      ]}
      working={`Y = (a − bT + I + G) ÷ (1 − b) = (${a} − ${b.toFixed(2)}×${T} + ${I} + ${G}) ÷ ${(1 - b).toFixed(2)} = ${n0(Y)}`}
    />
  );
}

const AS_PTS: [number, number][] = (() => {
  const pts: [number, number][] = [];
  for (let y = 0; y <= 420; y += 20) pts.push([y, 30]);
  for (let y = 440; y <= 760; y += 20) pts.push([y, 30 + 52 * Math.pow((y - 420) / 340, 2.4)]);
  pts.push([780, 95], [785, 116]);
  return pts;
})();
const asP = (y: number) => {
  for (let i = 1; i < AS_PTS.length; i++) if (AS_PTS[i][0] >= y) { const [x0, y0] = AS_PTS[i - 1], [x1, y1] = AS_PTS[i]; return y0 + ((y1 - y0) * (y - x0)) / (x1 - x0); }
  return 999;
};

function AdAsLab() {
  const [c, setC] = useState(62);
  let lo = 0, hi = 784;
  for (let k = 0; k < 50; k++) { const m = (lo + hi) / 2; if (c - 0.12 * m > asP(m)) lo = m; else hi = m; }
  const Y = lo, P = c - 0.12 * lo;
  const range = Y < 425 ? 'Keynesian range: output changes, prices barely move.' : Y < 770 ? 'Intermediate range: output and prices both change.' : 'Classical range: at full employment, only prices change.';
  const axes: Axes = { xmax: 1000, ymax: 120, xlabel: 'Real output Y', ylabel: 'Price level P' };
  return (
    <LabShell
      intro="Push aggregate demand up and see which range of the AS curve you land in."
      graph={
        <Plot axes={axes} title={`AD-AS: output ${n0(Y)}, price level ${n0(P)}`}>
          {(s) => (
            <>
              <path d={AS_PTS.map((p, i) => `${i ? 'L' : 'M'}${s.x(p[0])} ${s.y(Math.min(p[1], 119))}`).join(' ')} className="text-text" stroke="currentColor" strokeWidth={3} fill="none" />
              <Seg axes={axes} s={s} p={[0, c]} q={[1000, c - 120]} label="AD" />
              <Dot s={s} x={Y} y={P} />
            </>
          )}
        </Plot>
      }
      controls={<Slider label="Aggregate demand" value={c} min={50} max={150} step={1} onChange={setC} fmt={(v) => (v < 70 ? 'low' : v < 100 ? 'medium' : v < 130 ? 'high' : 'very high')} />}
      readout={[['Real output Y', n0(Y)], ['Price level P', n0(P)], ['Range', Y < 425 ? 'Keynesian' : Y < 770 ? 'Intermediate' : 'Classical']]}
      working={range}
    />
  );
}

function InflationLab() {
  const [d, setD] = useState(0), [k, setK] = useState(0);
  const cAD = 90 + d, cAS = 10 + k;
  const Y = (cAD - cAS) / 1.6, P = cAD - 0.8 * Y;
  const kind = d > 0 && k > 0 ? 'Both: prices rise sharply' : d > 0 ? 'Demand-pull inflation' : k > 0 ? 'Cost-push inflation (stagflation)' : d < 0 || k < 0 ? 'Prices falling' : 'Starting point';
  const axes: Axes = { xmax: 100, ymax: 100, xlabel: 'Real output Y', ylabel: 'Price level P' };
  return (
    <LabShell
      intro="Raise spending or raise costs, and compare what happens to prices and output."
      graph={
        <Plot axes={axes} title={`Price level ${n1(P)}, output ${n1(Y)}`}>
          {(s) => (
            <>
              <Seg axes={axes} s={s} p={[0, cAD]} q={[100, cAD - 80]} label="AD" />
              <Seg axes={axes} s={s} p={[0, cAS]} q={[100, cAS + 80]} tone="text" label="SRAS" />
              <Dot s={s} x={Y} y={P} xl={n1(Y)} yl={n1(P)} />
            </>
          )}
        </Plot>
      }
      controls={
        <>
          <Slider label="Extra spending (shifts AD)" value={d} min={-20} max={30} step={2} onChange={setD} fmt={(v) => (v > 0 ? `+${v}` : `${v}`)} />
          <Slider label="Higher costs (shifts SRAS up)" value={k} min={-20} max={30} step={2} onChange={setK} fmt={(v) => (v > 0 ? `+${v}` : `${v}`)} />
        </>
      }
      readout={[['Price level', `${n1(P)} (was 50)`], ['Output', `${n1(Y)} (was 50)`], ['What this is', kind]]}
      working="AD: P = 90 + spending − 0.8Y.  SRAS: P = 10 + costs + 0.8Y.  Solve where they meet."
    />
  );
}

function MoneyLab() {
  const [M, setM] = useState(1000), [P, setP] = useState(2), [L0, setL0] = useState(1000);
  const real = M / P;
  const r = (L0 - real) / 100;
  const axes: Axes = { xmax: 1600, ymax: 12, xlabel: 'Real balances M/P', ylabel: 'Interest rate r %' };
  return (
    <LabShell
      intro="This is the Unit 5.1 exercise: (M/P)ᵈ = 1,000 − 100r. Be the Bank of Zambia."
      graph={
        <Plot axes={axes} title={`Money market: interest rate ${n1(r)} percent`}>
          {(s) => (
            <>
              <Seg axes={axes} s={s} p={[L0 - 1200, 12]} q={[L0, 0]} label="Md" />
              <Seg axes={axes} s={s} p={[real, 0]} q={[real, 12]} tone="text" label="M/P" />
              {r >= 0 && r <= 12 && <Dot s={s} x={real} y={r} yl={`${n1(r)}%`} />}
            </>
          )}
        </Plot>
      }
      controls={
        <>
          <Slider label="Money supply M" value={M} min={200} max={2400} step={50} onChange={setM} fmt={n0} />
          <Slider label="Price level P" value={P} min={1} max={4} step={0.5} onChange={setP} />
          <Slider label="Income (shifts money demand)" value={L0} min={800} max={1400} step={50} onChange={setL0} fmt={(v) => (v === 1000 ? 'as in exercise' : v > 1000 ? 'higher' : 'lower')} />
        </>
      }
      readout={[['M/P', n0(real)], ['Interest rate r', r < 0 ? 'below zero' : `${n1(r)}%`], ['Money demand', `${n0(L0)} − 100r`]]}
      working={`${n0(real)} = ${n0(L0)} − 100r  →  r = (${n0(L0)} − ${n0(real)}) ÷ 100 = ${n1(r)}%`}
    />
  );
}

function CreditLab() {
  const [D, setD] = useState(100000), [rr, setRr] = useState(10);
  const ratio = rr / 100;
  const rounds = Array.from({ length: 10 }, (_, i) => D * Math.pow(1 - ratio, i));
  const total = D / ratio;
  const maxH = 150;
  return (
    <LabShell
      intro="Pick a deposit and a reserve ratio. Each bar is one bank in the chain, and the gold top is what it keeps."
      graph={
        <svg viewBox="0 0 420 210" className="h-auto w-full max-w-[520px]" role="img" aria-label={`Deposits grow to ${n0(total)} kwacha`}>
          <line x1={10} y1={180} x2={410} y2={180} className="text-muted" stroke="currentColor" strokeWidth={2} />
          {rounds.map((v, i) => {
            const h = (v / D) * maxH, x = 18 + i * 39;
            return (
              <g key={i}>
                <rect x={x} y={180 - h} width={28} height={h} rx={3} className="text-accent" fill="currentColor" />
                <rect x={x} y={180 - h} width={28} height={h * ratio} rx={2} className="text-warn" fill="currentColor" />
                <text x={x + 14} y={196} textAnchor="middle" className="fill-current text-muted font-mono text-[10px]">{i + 1}</text>
              </g>
            );
          })}
          <text x={410} y={206} textAnchor="end" className="fill-current text-muted font-mono text-[10px] uppercase">round</text>
        </svg>
      }
      controls={
        <>
          <Slider label="First deposit (K)" value={D} min={10000} max={500000} step={10000} onChange={setD} fmt={(v) => 'K' + n0(v)} />
          <Slider label="Reserve ratio" value={rr} min={5} max={50} step={1} onChange={setRr} fmt={(v) => `${v}%`} />
        </>
      }
      readout={[['Money multiplier', n1(1 / ratio)], ['Total deposits', 'K' + n0(total)], ['New money created', 'K' + n0(total - D)]]}
      working={`Total deposits = K${n0(D)} × 1 ÷ ${ratio.toFixed(2)} = K${n0(total)}`}
    />
  );
}

function FxLab() {
  const [d, setD] = useState(0), [sv, setSv] = useState(0);
  const cD = 8 + d, cS = 2 - sv;
  const Q = (cD - cS) / 0.12, Pr = cD - 0.06 * Q;
  const move = Pr > 5.05 ? 'The kwacha appreciates' : Pr < 4.95 ? 'The kwacha depreciates' : 'No change';
  const axes: Axes = { xmax: 120, ymax: 9, xlabel: 'Quantity of kwacha', ylabel: 'US cents per K1' };
  return (
    <LabShell
      intro="Move export earnings and the import bill. Watch the kwacha."
      graph={
        <Plot axes={axes} title={`Kwacha worth ${Pr.toFixed(1)} US cents`}>
          {(s) => (
            <>
              <Seg axes={axes} s={s} p={[0, cD]} q={[150, cD - 9]} label="D" />
              <Seg axes={axes} s={s} p={[0, cS]} q={[150, cS + 9]} tone="warn" label="S" />
              <Dot s={s} x={Q} y={Pr} yl={Pr.toFixed(1)} />
            </>
          )}
        </Plot>
      }
      controls={
        <>
          <Slider label="Export earnings, e.g. copper (demand for K)" value={d} min={-1.5} max={1.5} step={0.1} onChange={setD} fmt={(v) => (v > 0 ? 'higher' : v < 0 ? 'lower' : 'normal')} />
          <Slider label="Import bill, e.g. fuel (supply of K)" value={sv} min={-1.5} max={1.5} step={0.1} onChange={setSv} fmt={(v) => (v > 0 ? 'higher' : v < 0 ? 'lower' : 'normal')} />
        </>
      }
      readout={[['Value of K1', `${Pr.toFixed(1)} US cents`], ['Change', move], ['K per US$1', n1(100 / Pr)]]}
      working="Demand for kwacha comes from exports and inward investment. Supply comes from imports and investment abroad."
    />
  );
}

function LafferLab() {
  const [t, setT] = useState(30);
  const R = (x: number) => (x * (100 - x)) / 25;
  const axes: Axes = { xmax: 100, ymax: 110, xlabel: 'Tax rate %', ylabel: 'Revenue' };
  return (
    <LabShell
      intro="Slide the tax rate. Past the peak, a higher rate brings in less."
      graph={
        <Plot axes={axes} title={`Revenue ${n0(R(t))} at ${t} percent`}>
          {(s) => (
            <>
              <path d={Array.from({ length: 51 }, (_, i) => `${i ? 'L' : 'M'}${s.x(i * 2)} ${s.y(R(i * 2))}`).join(' ')} className="text-accent" stroke="currentColor" strokeWidth={3} fill="none" />
              <Dot s={s} x={t} y={R(t)} xl={`${t}%`} />
            </>
          )}
        </Plot>
      }
      controls={<Slider label="Tax rate" value={t} min={0} max={100} step={1} onChange={setT} fmt={(v) => `${v}%`} />}
      readout={[['Revenue', n0(R(t))], ['Side of the peak', t < 50 ? 'below Tx: a cut loses revenue' : t > 50 ? 'above Tx: a cut gains revenue' : 'at the peak']]}
      working="This curve peaks at 50% only to keep the drawing simple. In real economies nobody knows exactly where Tx is."
    />
  );
}

export function LabShell({ intro, graph, controls, readout, working }: { intro: string; graph: React.ReactNode; controls: React.ReactNode; readout: [string, string][]; working: string }) {
  return (
    <section className={`${panel} space-y-4`} aria-label="Try it yourself">
      <div>
        <p className={labelCls}>Try it yourself</p>
        <p className="text-sm text-muted">{intro}</p>
      </div>
      <div className="grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>{graph}</div>
        <div className="space-y-4">{controls}</div>
      </div>
      <Readout items={readout} />
      <p className="rounded-md bg-bg px-3 py-2 font-mono text-xs leading-relaxed text-muted sm:text-sm" aria-live="polite">{working}</p>
    </section>
  );
}

const LABS: Partial<Record<TopicId, () => React.ReactElement>> = {
  'econ-keynesian-cross': KeynesianLab,
  'econ-ad-as': AdAsLab,
  'econ-inflation': InflationLab,
  'econ-money-market': MoneyLab,
  'econ-credit-creation': CreditLab,
  'econ-exchange-rate': FxLab,
  'econ-laffer': LafferLab,
};

export function EconLab({ topicId }: { topicId: TopicId }) {
  const Lab = LABS[topicId];
  return Lab ? <Lab /> : null;
}
