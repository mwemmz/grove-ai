/* Dual coding: find the picture that goes with some words, among the pictures this student may see. */
import { ECON_MATCH } from './econVisuals';
import { BIT_MATCH } from './bitVisuals';
import { TOPIC_BY_ID, type TopicId } from './visualTopics';
import { canSee } from '../services/access';

const ALL: [TopicId, RegExp][] = [...ECON_MATCH, ...BIT_MATCH];
const visible = () => ALL.filter(([id]) => canSee(TOPIC_BY_ID[id]?.audience));
const hits = (text: string, re: RegExp) => (text.match(new RegExp(re.source, 'gi')) ?? []).length;

/** Pictures that explain this text, best match first. */
export function picturesFor(text: string, n = 2): TopicId[] {
  return visible()
    .map(([id, re]) => ({ id, h: hits(text, re) }))
    .filter((x) => x.h > 0)
    .sort((a, b) => b.h - a.h)
    .slice(0, n)
    .map((x) => x.id);
}

/** Where to put pictures in a long note: each topic goes after the paragraph (slide) that talks about it most,
 *  never after the title slide unless nothing else matches. Returns paragraph index → topics. */
export function placePictures(paras: string[], max = 4): Map<number, TopicId[]> {
  const best = new Map<TopicId, { idx: number; hits: number; total: number }>();
  const list = visible();
  paras.forEach((para, idx) => {
    for (const [id, re] of list) {
      const h = hits(para, re) * (idx === 0 ? 0.5 : 1);
      if (!h) continue;
      const cur = best.get(id);
      if (!cur) best.set(id, { idx, hits: h, total: h });
      else {
        cur.total += h;
        if (h > cur.hits) Object.assign(cur, { idx, hits: h });
      }
    }
  });
  const chosen = [...best.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, max);
  const out = new Map<number, TopicId[]>();
  for (const [id, { idx }] of chosen) out.set(idx, [...(out.get(idx) ?? []), id]);
  return out;
}
