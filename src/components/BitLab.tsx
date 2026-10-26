/* "Try it yourself" labs for BIT353: the student changes the inputs and sees the result worked out. */
import React, { useId, useMemo, useState } from 'react';
import type { TopicId } from '../data/visualTopics';
import { LabShell, Slider } from './EconLab';
import { field } from './ui';

const n0 = (v: number) => Math.round(v).toLocaleString('en-US');
const pct = (v: number) => `${Math.round(v * 1000) / 10}%`;

/* ---------------------------------------------------------------- HDFS */

function HdfsLab() {
  const [size, setSize] = useState(1000), [block, setBlock] = useState(128), [rep, setRep] = useState(3), [nodes, setNodes] = useState(6);
  const blocks = Math.ceil(size / block);
  const r = Math.min(rep, nodes);
  const used = size * r;
  // Round-robin placement: copy c of block b goes to node (b + c) mod nodes, so the copies of a block are on different nodes.
  const grid = Array.from({ length: nodes }, (_, n) => Array.from({ length: blocks }, (_, b) => b).filter((b) => Array.from({ length: r }, (_, c) => (b + c) % nodes).includes(n)));
  const shown = Math.min(blocks, 24);
  return (
    <LabShell
      intro="Change the file, the block size and the replication factor. Each column is a DataNode; each square is one copy of a block."
      graph={
        <div className="flex gap-1.5 overflow-x-auto pb-1" role="img" aria-label={`${blocks} blocks, ${r} copies each, across ${nodes} DataNodes`}>
          {grid.map((list, n) => (
            <div key={n} className="min-w-[44px] flex-1 rounded-md bg-bg p-1.5 ring-1 ring-line">
              <p className="mb-1 text-center font-mono text-[10px] text-muted">DN{n + 1}</p>
              <div className="flex flex-wrap justify-center gap-0.5">
                {list.filter((b) => b < shown).map((b) => (
                  <span key={b} className="grid h-4 w-4 place-items-center rounded-sm bg-accent font-mono text-[8px] text-ink">{b + 1}</span>
                ))}
              </div>
              <p className="mt-1 text-center font-mono text-[10px] text-muted">{list.length}</p>
            </div>
          ))}
        </div>
      }
      controls={
        <>
          <Slider label="File size" value={size} min={100} max={5000} step={50} onChange={setSize} fmt={(v) => `${n0(v)} MB`} />
          <Slider label="Block size" value={block} min={64} max={256} step={64} onChange={setBlock} fmt={(v) => `${v} MB`} />
          <Slider label="Replication factor" value={rep} min={1} max={5} step={1} onChange={setRep} />
          <Slider label="DataNodes" value={nodes} min={3} max={10} step={1} onChange={setNodes} />
        </>
      }
      readout={[
        ['Blocks', n0(blocks)],
        ['Copies stored', n0(blocks * r)],
        ['Disk used', `${n0(used)} MB`],
        ['Nodes that can fail safely', String(r - 1)],
        ['NameNode entries', `${n0(blocks)} blocks + 1 file`],
      ]}
      working={`${n0(size)} MB ÷ ${block} MB = ${n0(blocks)} blocks (rounded up). × ${r} copies = ${n0(blocks * r)} block copies, ${n0(used)} MB of disk.${blocks > shown ? ` Showing the first ${shown} blocks.` : ''}`}
    />
  );
}

/* ---------------------------------------------------------------- MapReduce */

const SAMPLE = `Lusaka,18
Harare,20
Lusaka,38
Cape Town,33
Lusaka,25
Windhoek,32
Harare,27
Cape Town,21
Windhoek,29`;

function MapReduceLab() {
  const [text, setText] = useState(SAMPLE);
  const [fn, setFn] = useState<'max' | 'sum' | 'count'>('max');
  const id = useId();
  const { pairs, groups, out, bad } = useMemo(() => {
    const pairs: [string, number][] = [];
    let bad = 0;
    for (const line of text.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 60)) {
      const i = line.lastIndexOf(',');
      const k = line.slice(0, i).trim(), v = Number(line.slice(i + 1));
      if (i < 1 || !k || !Number.isFinite(v)) { bad++; continue; }
      pairs.push([k, v]);
    }
    const groups = new Map<string, number[]>();
    for (const [k, v] of pairs) groups.set(k, [...(groups.get(k) ?? []), v]);
    const sorted = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const red = (vs: number[]) => (fn === 'max' ? Math.max(...vs) : fn === 'sum' ? vs.reduce((a, b) => a + b, 0) : vs.length);
    return { pairs, groups: sorted, out: sorted.map(([k, vs]) => [k, red(vs)] as [string, number]), bad };
  }, [text, fn]);
  const col = 'rounded-md bg-bg p-2 ring-1 ring-line font-mono text-xs leading-5 text-text';
  return (
    <LabShell
      intro="Type your own lines as key,value and pick what the reducer does. Watch the three phases."
      graph={
        <div className="grid gap-2 2xl:grid-cols-3">
          <div className={col}>
            <p className="mb-1 text-[10px] uppercase tracking-wider text-muted">1 · Map</p>
            {pairs.slice(0, 12).map(([k, v], i) => <div key={i}>&lt;{k}, {v}&gt;</div>)}
            {pairs.length > 12 && <div className="text-muted">+{pairs.length - 12} more</div>}
          </div>
          <div className={col}>
            <p className="mb-1 text-[10px] uppercase tracking-wider text-muted">2 · Shuffle &amp; sort</p>
            {groups.map(([k, vs]) => <div key={k}>{k}: [{vs.join(', ')}]</div>)}
          </div>
          <div className={col}>
            <p className="mb-1 text-[10px] uppercase tracking-wider text-muted">3 · Reduce ({fn})</p>
            {out.map(([k, v]) => <div key={k} className="text-accent">&lt;{k}, {v}&gt;</div>)}
          </div>
        </div>
      }
      controls={
        <>
          <div>
            <label htmlFor={id} className="text-sm text-text">Input: one key,value per line</label>
            <textarea id={id} rows={7} value={text} onChange={(e) => setText(e.target.value)} className={`${field} mt-1 font-mono text-sm`} />
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Reducer function">
            {(['max', 'sum', 'count'] as const).map((f) => (
              <button key={f} type="button" onClick={() => setFn(f)} aria-pressed={fn === f} className={`min-h-9 rounded-md px-3 text-sm ring-1 ${fn === f ? 'bg-raised text-text ring-accent/70' : 'text-muted ring-line hover:text-text'}`}>
                {f === 'max' ? 'Maximum' : f === 'sum' ? 'Total' : 'Count'}
              </button>
            ))}
          </div>
        </>
      }
      readout={[['Map outputs', String(pairs.length)], ['Keys (reducers)', String(groups.length)], ['Lines skipped', String(bad)]]}
      working="Each line becomes one <key, value> pair. Shuffle groups pairs by key, so one reducer sees every value for its key and returns one answer."
    />
  );
}

/* ---------------------------------------------------------------- association rules */

function RulesLab() {
  const [N, setN] = useState(6), [a, setA] = useState(4), [b, setB] = useState(3), [ab, setAb] = useState(3);
  const A = Math.min(a, N), B = Math.min(b, N), AB = Math.min(ab, A, B);
  const support = AB / N, confidence = A ? AB / A : 0, lift = B ? confidence / (B / N) : 0;
  const verdict = lift > 1.05 ? 'Bought together more than by chance' : lift < 0.95 ? 'Bought together less than by chance' : 'No real association';
  return (
    <LabShell
      intro="Rule: A → B (e.g. bread → butter). Set the counts from a basket table; the six-basket example from the picture is the default."
      graph={
        <div className="space-y-3" role="img" aria-label={`Support ${pct(support)}, confidence ${pct(confidence)}, lift ${lift.toFixed(2)}`}>
          {[['Support', support, 'baskets with A and B ÷ all baskets'], ['Confidence', confidence, 'baskets with A and B ÷ baskets with A']].map(([k, v, h]) => (
            <div key={k as string}>
              <div className="flex justify-between text-sm"><span className="text-text">{k as string}</span><span className="font-mono text-accent">{pct(v as number)}</span></div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-bg ring-1 ring-line"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (v as number) * 100)}%` }} /></div>
              <p className="mt-0.5 text-xs text-muted">{h as string}</p>
            </div>
          ))}
          <div>
            <div className="flex justify-between text-sm"><span className="text-text">Lift</span><span className={`font-mono ${lift > 1.05 ? 'text-accent' : 'text-warn'}`}>{lift.toFixed(2)}</span></div>
            <p className="text-xs text-muted">confidence ÷ (baskets with B ÷ all baskets). 1 means independent.</p>
          </div>
        </div>
      }
      controls={
        <>
          <Slider label="All baskets" value={N} min={2} max={100} step={1} onChange={setN} />
          <Slider label="Baskets with A" value={A} min={1} max={N} step={1} onChange={setA} />
          <Slider label="Baskets with B" value={B} min={1} max={N} step={1} onChange={setB} />
          <Slider label="Baskets with A and B" value={AB} min={0} max={Math.min(A, B)} step={1} onChange={setAb} />
        </>
      }
      readout={[['Support', pct(support)], ['Confidence', pct(confidence)], ['Lift', lift.toFixed(2)], ['Verdict', verdict]]}
      working={`support = ${AB} ÷ ${N} = ${pct(support)} · confidence = ${AB} ÷ ${A} = ${pct(confidence)} · lift = ${pct(confidence)} ÷ (${B} ÷ ${N}) = ${lift.toFixed(2)}`}
    />
  );
}

/* ---------------------------------------------------------------- OLAP */

const REGIONS = ['Lusaka', 'Copperbelt', 'Southern'];
const PRODUCTS = ['Phones', 'Laptops', 'TVs'];
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
// sales[region][product][quarter], K000
const SALES = [
  [[120, 130, 140, 160], [80, 85, 90, 110], [45, 50, 55, 70]],
  [[95, 90, 100, 120], [60, 70, 75, 90], [30, 35, 40, 55]],
  [[40, 45, 50, 60], [25, 30, 30, 40], [15, 20, 20, 30]],
];
const MONTHS: Record<string, [string, number][]> = { Q1: [['Jan', 0.31], ['Feb', 0.34], ['Mar', 0.35]] };
type Op = 'slice' | 'dice' | 'rollup' | 'drill' | 'pivot';

function OlapLab() {
  const [op, setOp] = useState<Op>('slice');
  const [q, setQ] = useState('Q1');
  const qi = QUARTERS.indexOf(q);
  let cols: string[] = [], rows: [string, ...number[]][] = [], what = '';
  if (op === 'slice') {
    cols = PRODUCTS; rows = REGIONS.map((r, i) => [r, ...SALES[i].map((p) => p[qi])]); what = `Slice: quarter = ${q}. One layer of the cube.`;
  } else if (op === 'dice') {
    cols = ['Q1', 'Q2']; rows = [0, 1].flatMap((ri) => [0, 1].map((pi) => [`${REGIONS[ri]} · ${PRODUCTS[pi]}`, SALES[ri][pi][0], SALES[ri][pi][1]] as [string, ...number[]])); what = 'Dice: Lusaka and Copperbelt × Phones and Laptops × Q1–Q2. A smaller cube.';
  } else if (op === 'rollup') {
    cols = PRODUCTS; rows = [['Zambia · year', ...PRODUCTS.map((_, pi) => SALES.reduce((s, r) => s + r[pi].reduce((a, b) => a + b, 0), 0))]]; what = 'Roll-up: regions → Zambia and quarters → year. Everything added up.';
  } else if (op === 'drill') {
    const months = MONTHS.Q1;
    cols = months.map((m) => m[0]); rows = PRODUCTS.map((p, pi) => [p, ...months.map(([, share]) => Math.round(SALES[0][pi][0] * share))]); what = 'Drill-down: Lusaka Q1 broken into months. More detail.';
  } else {
    cols = REGIONS; rows = PRODUCTS.map((p, pi) => [p, ...REGIONS.map((_, ri) => SALES[ri][pi][qi])]); what = `Pivot: products as rows, regions as columns (${q}).`;
  }
  return (
    <LabShell
      intro="Pick an operation and see the table it produces from the same sales cube (K000)."
      graph={
        <div className="overflow-x-auto">
          <table className="w-full min-w-[300px] border-collapse font-mono text-sm">
            <thead>
              <tr>
                <th className="border border-line px-2 py-1.5" />
                {cols.map((c) => <th key={c} className="border border-line px-2 py-1.5 text-right font-medium text-muted">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map(([h, ...vs]) => (
                <tr key={h}>
                  <th className="border border-line px-2 py-1.5 text-left font-medium text-text">{h}</th>
                  {vs.map((v, i) => <td key={i} className="border border-line px-2 py-1.5 text-right text-text">{n0(v)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
      controls={
        <>
          <div className="flex flex-wrap gap-2" role="group" aria-label="OLAP operation">
            {([['slice', 'Slice'], ['dice', 'Dice'], ['rollup', 'Roll-up'], ['drill', 'Drill-down'], ['pivot', 'Pivot']] as [Op, string][]).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setOp(k)} aria-pressed={op === k} className={`min-h-9 rounded-md px-3 text-sm ring-1 ${op === k ? 'bg-raised text-text ring-accent/70' : 'text-muted ring-line hover:text-text'}`}>
                {l}
              </button>
            ))}
          </div>
          {(op === 'slice' || op === 'pivot') && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Quarter">
              {QUARTERS.map((x) => (
                <button key={x} type="button" onClick={() => setQ(x)} aria-pressed={q === x} className={`min-h-9 rounded-md px-3 font-mono text-sm ring-1 ${q === x ? 'bg-raised text-text ring-accent/70' : 'text-muted ring-line hover:text-text'}`}>
                  {x}
                </button>
              ))}
            </div>
          )}
        </>
      }
      readout={[['Rows', String(rows.length)], ['Columns', String(cols.length)]]}
      working={what}
    />
  );
}

const LABS: Partial<Record<TopicId, () => React.ReactElement>> = {
  'bit-hdfs': HdfsLab,
  'bit-mapreduce': MapReduceLab,
  'bit-data-mining': RulesLab,
  'bit-olap-cube': OlapLab,
};

export function BitLab({ topicId }: { topicId: TopicId }) {
  const Lab = LABS[topicId];
  return Lab ? <Lab /> : null;
}
