/* Reads text from pictures: scanned PDF pages, photos of slides or handouts. Tesseract runs in the browser,
   from files Grove serves itself (/ml/ocr), so nothing is uploaded anywhere. */
import type { Worker as TWorker } from 'tesseract.js';

let worker: Promise<TWorker> | null = null;
function getWorker(): Promise<TWorker> {
  worker ??= import('tesseract.js').then(({ createWorker }) =>
    createWorker('eng', 1, {
      workerPath: '/ml/ocr/worker.min.js',
      corePath: '/ml/ocr/core',
      langPath: '/ml/ocr/lang',
      gzip: true,
      workerBlobURL: false,
    }),
  );
  return worker;
}

/** Text in an image (a canvas, a Blob, or an image file). */
export async function ocrImage(img: HTMLCanvasElement | Blob): Promise<string> {
  const w = await getWorker();
  const { data } = await w.recognize(img);
  // Logos and specks come back as stray fragments ("oF", "Ww"): keep only lines with at least one real word.
  return data.text
    .split('\n')
    .filter((l) => /[A-Za-z]{3,}|\d{2,}/.test(l))
    .join('\n');
}

/** Frees the OCR engine's memory once a batch of files is done. */
export async function ocrDone() {
  if (!worker) return;
  const w = await worker;
  worker = null;
  await w.terminate();
}
