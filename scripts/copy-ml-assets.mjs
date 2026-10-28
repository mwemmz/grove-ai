// Copies the on-device ML files into public/ml at build time (they are not committed):
//  - MiniLM sentence-embedding model (Apache-2.0) and tokenizer, checked against their published sha256
//  - Tesseract OCR worker, core and English model
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const nm = (p) => join('node_modules', p);
const out = (p) => join('public', 'ml', p);
const copy = (from, to) => {
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
};

// 1. Embedding model
const modelDir = nm('@ryanstark24/sfgraph-models/data');
const sums = JSON.parse(readFileSync(join(modelDir, 'CHECKSUM.json'), 'utf8')).files;
for (const f of ['config.json', 'tokenizer.json', 'tokenizer_config.json', 'onnx/model_quantized.onnx']) {
  const rel = `Xenova/all-MiniLM-L6-v2/${f}`;
  const src = join(modelDir, rel);
  const sha = createHash('sha256').update(readFileSync(src)).digest('hex');
  if (sums[rel] && sums[rel] !== sha) throw new Error(`Checksum mismatch for ${rel}`);
  copy(src, out(`minilm/${f.replace('onnx/', '')}`));
}

// 2. The ONNX runtime's WebAssembly is bundled by Vite with the worker (see src/workers/embed.worker.ts).

// 3. OCR
copy(nm('tesseract.js/dist/worker.min.js'), out('ocr/worker.min.js'));
for (const f of ['tesseract-core-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js', 'tesseract-core-relaxedsimd-lstm.wasm.js', 'tesseract-core-lstm.wasm', 'tesseract-core-simd-lstm.wasm', 'tesseract-core-relaxedsimd-lstm.wasm']) {
  if (existsSync(nm(`tesseract.js-core/${f}`))) copy(nm(`tesseract.js-core/${f}`), out(`ocr/core/${f}`));
}
copy(nm('@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz'), out('ocr/lang/eng.traineddata.gz'));
console.log('ML assets copied to public/ml');
