/* Turn an uploaded study file into plain text, entirely in the browser (nothing is sent anywhere). */

export const MAX_BYTES = 8 * 1024 * 1024;
export const MAX_CHARS = 60_000;
export const ACCEPT = '.txt,.md,.markdown,.csv,.json,.html,.htm,.pdf,.docx';

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

export async function extractText(file: File): Promise<ExtractedFile> {
  const e = ext(file.name);
  if (file.size > MAX_BYTES) throw new Error(`${file.name} is larger than 8 MB.`);
  let raw: string;
  if (e === 'pdf') raw = await pdfText(file);
  else if (e === 'docx') raw = await docxText(file);
  else if (TEXT_EXT.includes(e) || file.type.startsWith('text/')) {
    raw = await file.text();
    if (e === 'html' || e === 'htm') raw = new DOMParser().parseFromString(raw, 'text/html').body.textContent ?? '';
  } else throw new Error(`${file.name}: this file type isn't supported. Use PDF, Word (.docx), text, Markdown or CSV.`);
  const text = tidy(raw);
  if (!text) throw new Error(`${file.name}: no readable text found. Scanned PDFs need OCR first.`);
  return { title: baseName(file.name), text: text.slice(0, MAX_CHARS), truncated: text.length > MAX_CHARS };
}
