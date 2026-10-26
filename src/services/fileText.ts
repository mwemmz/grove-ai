/* Turn an uploaded study file into plain text, entirely in the browser (nothing is sent anywhere). */

export const MAX_BYTES = 8 * 1024 * 1024;
export const MAX_CHARS = 60_000;
export const ACCEPT = '.txt,.md,.markdown,.csv,.json,.html,.htm,.pdf,.docx,.pptx,.pptm';

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

async function pdfText(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages: string[] = [];
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
    pages.push(lines.join('\n'));
    if (pages.join('\n\n').length > MAX_CHARS * 1.2) break;
  }
  return pages.join('\n\n');
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
    if (!title && body.length === 0) continue;
    if (!title) {
      // No title placeholder: a short first line is the title, otherwise its first words are.
      const first = body[0].replace(/^\s*-\s*/, '');
      if (first.length <= 70 && !/[.:]$/.test(first)) { title = first; body.shift(); }
      else title = first.split(/[.:;]\s/)[0].slice(0, 56).trim();
    }
    slides.push([`### ${title}`, ...body].join('\n'));
  }
  return slides.join('\n\n');
}

export async function extractText(file: File): Promise<ExtractedFile> {
  const e = ext(file.name);
  if (file.size > MAX_BYTES) throw new Error(`${file.name} is larger than 8 MB.`);
  let raw: string;
  if (e === 'pdf') raw = await pdfText(file);
  else if (e === 'docx') raw = await docxText(file);
  else if (e === 'pptx' || e === 'pptm') raw = await pptxText(file);
  else if (TEXT_EXT.includes(e) || file.type.startsWith('text/')) {
    raw = await file.text();
    if (e === 'html' || e === 'htm') raw = new DOMParser().parseFromString(raw, 'text/html').body.textContent ?? '';
  } else throw new Error(`${file.name}: this file type isn't supported. Use PDF, Word (.docx), PowerPoint (.pptx), text, Markdown or CSV.`);
  const text = tidy(raw);
  if (!text) throw new Error(`${file.name}: no readable text found. Scanned PDFs need OCR first.`);
  return { title: baseName(file.name), text: text.slice(0, MAX_CHARS), truncated: text.length > MAX_CHARS };
}
