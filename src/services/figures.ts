/* Pictures inside notes: slide diagrams and figures.
   A note refers to a picture with a line like  ![Two-tier architecture](figure:BIT301/u4-7)  .
   "figure:<COURSE>/<id>" pictures come with a university notes pack and are fetched from Grove's server once;
   "figure:local/<id>" pictures were taken from a file the student uploaded and live on this device.
   Either way they are kept in the browser's storage (IndexedDB), never in the note text itself. */
import { get, set } from 'idb-keyval';
import { apiGet } from '../lib/api';

export const FIGURE_LINE = /^!\[([^\]]*)\]\((figure:[^)\s]+)\)\s*$/;
export const FIGURE_ANY = /!\[([^\]]*)\]\(figure:[^)\s]+\)/g;

const key = (ref: string) => `grove-fig:${ref}`;
const pending = new Map<string, Promise<string | null>>();

/** The picture as a data URL, or null if this device can't get it (a local picture from another device, or offline). */
export function loadFigure(ref: string): Promise<string | null> {
  let p = pending.get(ref);
  if (p) return p;
  p = (async () => {
    try {
      const have = await get<string>(key(ref));
      if (have) return have;
    } catch {
      /* storage blocked: try the network */
    }
    const m = /^figure:([A-Z0-9]+)\/(.+)$/.exec(ref);
    if (!m) return null; // figure:local/... that isn't on this device
    try {
      const { data } = await apiGet<{ data: string }>(`/packs?code=${encodeURIComponent(m[1])}&figure=${encodeURIComponent(m[2])}`);
      try {
        await set(key(ref), data);
      } catch {
        /* still show it this time */
      }
      return data;
    } catch {
      return null;
    }
  })();
  pending.set(ref, p);
  void p.then((v) => {
    if (!v) pending.delete(ref); // let a later visit try again
  });
  return p;
}

/** Shrinks a picture to at most `maxW` pixels wide and stores it on this device. Returns the reference to put in a note. */
export async function saveLocalFigure(src: CanvasImageSource & { width: number; height: number }, maxW = 1100): Promise<string> {
  const scale = Math.min(1, maxW / src.width);
  const c = document.createElement('canvas');
  c.width = Math.round(src.width * scale);
  c.height = Math.round(src.height * scale);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ffffff'; // transparent PNGs read better on a white card
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(src, 0, 0, c.width, c.height);
  let data = c.toDataURL('image/webp', 0.72);
  if (!data.startsWith('data:image/webp')) data = c.toDataURL('image/jpeg', 0.75); // Safari before 14
  const ref = `figure:local/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  await set(key(ref), data);
  return ref;
}

/** Note text with picture lines replaced by their captions, for search and flashcards. */
export const withoutFigures = (text: string) => text.replace(FIGURE_ANY, (_m, cap: string) => cap);

/** A pack file opened straight on this device (not published) brings its pictures with it: keep them here. */
export async function storePackFigures(code: string, figures: Record<string, string> | undefined): Promise<number> {
  if (!figures) return 0;
  let n = 0;
  for (const [id, data] of Object.entries(figures)) {
    if (typeof data !== 'string' || !data.startsWith('data:image/')) continue;
    try {
      await set(key(`figure:${code.toUpperCase()}/${id}`), data);
      n++;
    } catch {
      /* storage full */
    }
  }
  return n;
}
