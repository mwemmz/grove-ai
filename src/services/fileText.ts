/* Turn an uploaded study file into plain text, entirely in the browser (nothing is sent anywhere). */
import { ocrDone, ocrImage } from './ocr';
import { saveLocalFigure } from './figures';

export const MAX_BYTES = 8 * 1024 * 1024;
export const MAX_CHARS = 60_000;
export const ACCEPT = '.txt,.md,.markdown,.csv,.json,.html,.htm,.pdf,.docx,.pptx,.pptm,.png,.jpg,.jpeg,.webp';
const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'webp'];
/** Scanned pages beyond this are skipped: reading a page takes a few seconds on a phone. */
const MAX_OCR_PAGES = 40;
/** Pictures kept from one file (each is a small WebP on the student's device). */
const MAX_FIGURES = 30;

export type Progress = (message: string) => void;

const TEXT_EXT = ['txt', 'md', 'markdown', 'csv', 'json', 'html', 'htm'];

export interface ExtractedFile {
  title: string;
  text: string;
  truncated: boolean;
}

const ext = (name: string) => name.split('.').pop()?.toLowerCase() ?? '';
const baseName = (name: string) => name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Uploaded note';

function tidy(raw: string): string {
  return raw.replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

const SMALL = new Set('a an the of in to is are and or for as at by on be we us you can not all but how why who what with from that this they your has had was its one may per use set if so no do it'.split(' '));
const KEEP = new Set(['IT', 'ICT', 'IEEE', 'SDLC', 'UML', 'GUI', 'API', 'CPU', 'DBMS', 'SQL', 'ERD', 'DFD', 'UI', 'UX', 'AI', 'ML', 'IOT']);
/** Slides are often typed in capitals. Read as notes they shout, so sentence-case them, keeping acronyms. */
function calm(line: string): string {
  const letters = line.replace(/[^A-Za-z]/g, '');
  if (letters.length < 8 || letters.replace(/[^A-Z]/g, '').length / letters.length < 0.8) return line;
  const out = line.replace(/[A-Za-z][A-Za-z']*/g, (w) => (w === w.toUpperCase() && (KEEP.has(w) || !/[AEIOUY]/.test(w)) ? w : w.toLowerCase()));
  return out.replace(/(^|[.:!?]\s+)([a-z])/g, (_m, a, b) => a + b.toUpperCase()).replace(/^([^A-Za-z]*)([a-z])/, (_m, a, b) => a + b.toUpperCase());
}
const mostlyCaps = (t: string) => {
  const l = t.replace(/[^A-Za-z]/g, '');
  return l.length >= 4 && l.replace(/[^A-Z]/g, '').length / l.length > 0.8;
};

async function pdfText(file: File, onProgress?: Progress): Promise<{ text: string; ocrPages: number }> {
  const pdfjs = await import('pdfjs-dist');
  const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages: string[] = [];
  let ocrPages = 0;
  let figures = 0;
  // A deck saved as PDF: landscape pages, several of them. Each page is a slide, so it becomes a headed section.
  const first = (await doc.getPage(1)).getViewport({ scale: 1 });
  const deck = doc.numPages >= 5 && first.width > first.height * 1.25;
  const { OPS } = pdfjs;
  const paintOps = new Set([OPS.paintImageXObject, OPS.paintInlineImageXObject, OPS.paintImageXObjectRepeat]);
  /** How much of the page is figure: the largest picture's share of the page area (logos and icons are small),
   *  and how many shapes are drawn (diagrams made of boxes and arrows are shapes, not pictures). */
  const figureOn = async (page: Awaited<ReturnType<typeof doc.getPage>>) => {
    const { fnArray, argsArray } = await page.getOperatorList();
    const vp = page.getViewport({ scale: 1 });
    const pageArea = vp.width * vp.height;
    let ctm = [1, 0, 0, 1, 0, 0];
    const stack: number[][] = [];
    let best = 0;
    let shapes = 0;
    for (let k = 0; k < fnArray.length; k++) {
      const f = fnArray[k];
      if (f === OPS.constructPath) shapes++;
      if (f === OPS.save) stack.push(ctm);
      else if (f === OPS.restore) ctm = stack.pop() ?? [1, 0, 0, 1, 0, 0];
      else if (f === OPS.transform) {
        const [a, b, c, d, e, g] = argsArray[k] as number[];
        const [A, B, C, D, E, F] = ctm;
        ctm = [a * A + b * C, a * B + b * D, c * A + d * C, c * B + d * D, e * A + g * C + E, e * B + g * D + F];
      } else if (paintOps.has(f)) best = Math.max(best, Math.abs(ctm[0] * ctm[3] - ctm[1] * ctm[2]) / pageArea);
    }
    return { picture: best, shapes };
  };
  const render = async (page: Awaited<ReturnType<typeof doc.getPage>>, scale: number) => {
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport }).promise;
    return canvas;
  };
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let line = '';
    const lines: string[] = [];
    for (const item of content.items) {
      if (!('str' in item)) continue;
      line += item.str;
      if (item.hasEOL) { lines.push(line); line = ''; } else if (item.str && !item.str.endsWith(' ')) line += ' ';
    }
    if (line) lines.push(line);
    let text = lines.join('\n');
    // A page with (almost) no text layer is a picture of a page: read it with OCR.
    let canvas: HTMLCanvasElement | null = null;
    if ((text.match(/[A-Za-z0-9]/g) ?? []).length < 40 && ocrPages < MAX_OCR_PAGES) {
      onProgress?.(`Reading scanned page ${i} of ${doc.numPages}…`);
      canvas = await render(page, 2);
      const read = (await ocrImage(canvas)).trim();
      if (read) {
        text = read;
        ocrPages++;
      }
    }
    if (deck) {
      const ls = text.split('\n').map((l) => l.replace(/^[\s•●▪■◦·–—-]+/, '').trim()).filter((l) => l && !/^\d{1,3}$/.test(l));
      let title = ls.shift() ?? '';
      // A title that wraps onto a second capitalised line.
      if (title.length < 60 && ls[0] && ls[0].length < 60 && mostlyCaps(title) && mostlyCaps(ls[0])) title += ' ' + ls.shift();
      if (!title) continue;
      text = [`### ${calm(title)}`, ...ls.map((l) => `- ${calm(l)}`)].join('\n');
    }
    // Keep a picture of the page when it holds a real figure (a diagram, chart or photo, not just a logo).
    // The first page of a long deck is its title slide: never a figure.
    if (figures < MAX_FIGURES && !(i === 1 && doc.numPages > 5)) {
      const f = await figureOn(page).catch(() => ({ picture: 0, shapes: 0 }));
      const words = (text.match(/[A-Za-z0-9]/g) ?? []).length;
      // In a deck the background and the drawn text boxes are not figures: only a real picture is kept.
      const real = deck ? f.picture >= 0.12 && f.picture < 0.75 : f.picture >= 0.12 || (f.shapes >= 20 && words < 700);
      if (real) {
        onProgress?.(`Keeping the figure on page ${i}…`);
        canvas ??= await render(page, 1.6);
        try {
          const ref = await saveLocalFigure(canvas);
          text += `\n\n![Figure from page ${i}](${ref})`;
          figures++;
        } catch {
          /* storage full or blocked: keep the text */
        }
      }
    }
    if (deck && pages.length) {
      // Slides that build up (same title, more bullets each time) are one section, not several.
      const prev = pages[pages.length - 1];
      const head = text.split('\n')[0];
      if (head.startsWith('### ') && prev.split('\n')[0] === head) {
        const have = new Set(prev.split('\n'));
        pages[pages.length - 1] = [prev, ...text.split('\n').slice(1).filter((l) => l && !have.has(l))].join('\n');
        continue;
      }
    }
    pages.push(text);
    if (pages.join('\n\n').length > MAX_CHARS * 1.2) break;
  }
  if (ocrPages) await ocrDone();
  return { text: pages.join('\n\n'), ocrPages };
}

async function docxText(file: File): Promise<string> {
  const mammoth = await import('mammoth');
  const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return value;
}

/** PowerPoint (.pptx / .pptm): each slide becomes "### title" followed by its lines, in slide order.
 *  The title comes from the slide's title placeholder (PowerPoint stores it wherever the author drew it, often last),
 *  and indented bullets keep their level as "  - ". Macros are never run. */
async function pptxText(file: File): Promise<string> {
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const names = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/(\d+)\.xml$/)![1]) - Number(b.match(/(\d+)\.xml$/)![1]));
  const A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
  const P = 'http://schemas.openxmlformats.org/presentationml/2006/main';
  const slides: string[] = [];
  const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  // Pictures each slide shows, by media file. A picture on three or more slides is template furniture (a logo).
  const picsOf = new Map<string, string[]>();
  const uses = new Map<string, number>();
  for (const name of names) {
    const relsFile = zip.files[name.replace('slides/', 'slides/_rels/') + '.rels'];
    if (!relsFile) continue;
    const rels = new DOMParser().parseFromString(await relsFile.async('string'), 'application/xml');
    const target = new Map(Array.from(rels.getElementsByTagName('Relationship')).map((r) => [r.getAttribute('Id') ?? '', r.getAttribute('Target') ?? '']));
    const xml = new DOMParser().parseFromString(await zip.files[name].async('string'), 'application/xml');
    const media = Array.from(xml.getElementsByTagNameNS(P, 'pic'))
      .map((pic) => pic.getElementsByTagNameNS(A, 'blip')[0]?.getAttributeNS(R, 'embed') ?? '')
      .map((id) => target.get(id) ?? '')
      .filter((t) => /\.(png|jpe?g|gif|webp|bmp)$/i.test(t))
      .map((t) => 'ppt/' + t.replace(/^\.\.\//, ''));
    picsOf.set(name, [...new Set(media)]);
    for (const m of new Set(media)) uses.set(m, (uses.get(m) ?? 0) + 1);
  }
  let figures = 0;
  for (const name of names) {
    const xml = new DOMParser().parseFromString(await zip.files[name].async('string'), 'application/xml');
    let title = '';
    const body: string[] = [];
    for (const sp of Array.from(xml.getElementsByTagNameNS(P, 'sp'))) {
      const type = sp.getElementsByTagNameNS(P, 'ph')[0]?.getAttribute('type') ?? '';
      const paras = Array.from(sp.getElementsByTagNameNS(A, 'p')).map((p) => ({
        text: Array.from(p.getElementsByTagNameNS(A, 't')).map((t) => t.textContent ?? '').join('').trim(),
        lvl: Number(p.getElementsByTagNameNS(A, 'pPr')[0]?.getAttribute('lvl') ?? 0),
      })).filter((p) => p.text && !/^\d{1,3}$/.test(p.text));
      if ((type === 'title' || type === 'ctrTitle') && !title) title = paras.map((p) => p.text).join(' ');
      else if (type !== 'sldNum' && type !== 'ftr' && type !== 'dt') for (const p of paras) body.push(p.lvl > 0 ? `${'  '.repeat(Math.min(p.lvl, 2) - 1)}- ${p.text}` : p.text);
    }
    // Tables live in graphic frames, not shapes: keep them as pipe tables so they read as tables.
    for (const tbl of Array.from(xml.getElementsByTagNameNS(A, 'tbl'))) {
      const rows = Array.from(tbl.getElementsByTagNameNS(A, 'tr'))
        .map((tr) => Array.from(tr.getElementsByTagNameNS(A, 'tc')).map((tc) => Array.from(tc.getElementsByTagNameNS(A, 'p')).map((p) => Array.from(p.getElementsByTagNameNS(A, 't')).map((t) => t.textContent ?? '').join('').trim()).filter(Boolean).join(' ')))
        .filter((r) => r.some(Boolean));
      if (!rows.length) continue;
      const w = Math.max(...rows.map((r) => r.length));
      const fmt = (r: string[]) => `| ${Array.from({ length: w }, (_, i) => r[i] ?? '').join(' | ')} |`;
      body.push(fmt(rows[0]), `|${'---|'.repeat(w)}`, ...rows.slice(1).map(fmt));
    }
    const hasPics = (picsOf.get(name) ?? []).some((m) => (uses.get(m) ?? 0) < 3);
    if (!title && body.length === 0) {
      if (!hasPics) continue;
      title = `Slide ${Number(name.match(/(\d+)\.xml$/)![1])}`;
    }
    if (!title && body.length) {
      // No title placeholder: a short first line is the title, otherwise its first words are.
      const first = body[0].replace(/^\s*-\s*/, '');
      if (first.length <= 70 && !/[.:]$/.test(first)) { title = first; body.shift(); }
      else title = first.split(/[.:;]\s/)[0].slice(0, 56).trim();
    }
    for (const m of picsOf.get(name) ?? []) {
      if (figures >= MAX_FIGURES || (uses.get(m) ?? 0) >= 3 || !zip.files[m]) continue;
      const blob = await zip.files[m].async('blob');
      if (blob.size < 6000) continue; // icons and bullets
      try {
        const bmp = await createImageBitmap(blob);
        if (bmp.width < 160 || bmp.height < 100) continue;
        body.push('', `![${title}](${await saveLocalFigure(bmp)})`);
        figures++;
      } catch {
        /* a format this browser can't draw, or storage blocked */
      }
    }
    slides.push([`### ${title}`, ...body].join('\n'));
  }
  return slides.join('\n\n');
}

/** Word documents, plain text and ordinary PDFs arrive as bare lines. Give them the same shape as the headed notes:
 *  short stand-alone lines become headings (numbered 1.1 lines become sub-headings) and bullet marks become list items,
 *  so the reader can build sections, outline, pictures and questions from them in the same way. */
function shape(raw: string): string {
  if (/^#{1,4}\s/m.test(raw)) return raw; // already headed (slides, Markdown, packs)
  const lines = raw.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  let headed = 0;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    const prevBlank = i === 0 || !lines[i - 1].trim();
    const nextText = lines.slice(i + 1).some((l) => l.trim());
    const bullet = t.match(/^[•●▪■◦·–—*-]\s+(.*)$/);
    if (bullet) { out.push(`- ${calm(bullet[1])}`); continue; }
    const num = t.match(/^(\d+(?:\.\d+){0,2})[.)]?\s+([A-Za-z].{2,64})$/);
    const looksHead = t.length >= 3 && t.length <= 70 && !/[.,;:!?]$/.test(t) && prevBlank && nextText && t.split(/\s+/).length <= 9;
    const caps = mostlyCaps(t);
    const titled = /^[A-Z][^.]*$/.test(t) && t.split(/\s+/).filter((w) => /^[A-Z]/.test(w)).length >= Math.ceil(t.split(/\s+/).length * 0.6);
    if (num && num[2].length <= 64 && prevBlank) {
      headed++;
      out.push(`${num[1].includes('.') ? '###' : '##'} ${calm(num[2])}`);
    } else if (looksHead && (caps || titled)) {
      headed++;
      out.push(`## ${calm(t)}`);
    } else out.push(lines[i]);
  }
  return headed >= 2 ? out.join('\n') : raw;
}

export async function extractText(file: File, onProgress?: Progress): Promise<ExtractedFile> {
  const e = ext(file.name);
  if (file.size > MAX_BYTES) throw new Error(`${file.name} is larger than 8 MB.`);
  let raw: string;
  if (e === 'pdf') raw = (await pdfText(file, onProgress)).text;
  else if (IMAGE_EXT.includes(e) || file.type.startsWith('image/')) {
    onProgress?.(`Reading the text in ${file.name}…`);
    raw = await ocrImage(file);
    await ocrDone();
  }
  else if (e === 'docx') raw = await docxText(file);
  else if (e === 'pptx' || e === 'pptm') raw = await pptxText(file);
  else if (TEXT_EXT.includes(e) || file.type.startsWith('text/')) {
    raw = await file.text();
    if (e === 'html' || e === 'htm') raw = new DOMParser().parseFromString(raw, 'text/html').body.textContent ?? '';
  } else throw new Error(`${file.name}: this file type isn't supported. Use PDF, Word (.docx), PowerPoint (.pptx), a photo (PNG or JPG), text, Markdown or CSV.`);
  const text = tidy(e === 'pdf' || e === 'docx' || e === 'txt' ? shape(raw) : raw);
  if (!text) throw new Error(`${file.name}: no readable text found, even after reading the page images. Try a clearer scan or photo.`);
  return { title: baseName(file.name), text: text.slice(0, MAX_CHARS), truncated: text.length > MAX_CHARS };
}
