// Copies the on-device ML files into public/ml at build time (they are not committed):
//  - MiniLM sentence-embedding model (Apache-2.0) and tokenizer, downloaded from the official repository and verified
//  - Tesseract OCR worker, core and English model
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const nm = (p) => join('node_modules', p);
const out = (p) => join('public', 'ml', p);
const copy = (from, to) => {
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
};

// 1. Embedding model, from its official repository (Xenova/all-MiniLM-L6-v2 on Hugging Face, Apache-2.0).
//    Every file is checked against the hash Hugging Face itself publishes for it:
//    large files carry their sha256 in X-Linked-Etag; small files carry their git blob id in the ETag.
//    Pin a revision with MINILM_REVISION=<commit> for fully reproducible builds.
//    If the download fails the build still succeeds: Grove then uses keyword search only, as before.
const REPO = 'Xenova/all-MiniLM-L6-v2';
const REV = process.env.MINILM_REVISION || 'main';
const FILES = ['config.json', 'tokenizer.json', 'tokenizer_config.json', 'onnx/model_quantized.onnx'];
const CACHE = join('node_modules', '.cache', 'grove-minilm', REV);

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const gitBlob = (buf) => createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex');
const clean = (v) => (v ?? '').replace(/^W\//, '').replace(/"/g, '').trim();

async function fetchVerified(file) {
  const url = `${process.env.HF_ENDPOINT || 'https://huggingface.co'}/${REPO}/resolve/${REV}/${file}`;
  const head = await fetch(url, { redirect: 'manual' });
  const commit = head.headers.get('x-repo-commit');
  const lfs = clean(head.headers.get('x-linked-etag'));
  const etag = clean(head.headers.get('etag'));
  const where = head.status >= 300 && head.status < 400 ? new URL(head.headers.get('location'), url).toString() : url;
  const res = await fetch(where);
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  // Hugging Face publishes either a sha256 (64 hex digits, large files) or a git blob id (40 hex digits, small files),
  // in X-Linked-Etag or ETag depending on how the file is stored. Check whichever is there, by its kind.
  const published = [lfs, etag].filter((h) => /^[0-9a-f]{40}$|^[0-9a-f]{64}$/.test(h));
  if (!published.length) throw new Error(`${file}: Hugging Face published no hash to check against`);
  const ok = published.some((h) => (h.length === 64 ? sha256(buf) === h : gitBlob(buf) === h));
  if (!ok) throw new Error(`${file}: content does not match the hash published by Hugging Face (${published.join(', ')})`);
  return { buf, commit };
}

async function model() {
  const target = (f) => out(`minilm/${f.replace('onnx/', '')}`);
  if (FILES.every((f) => existsSync(join(CACHE, f)))) {
    for (const f of FILES) copy(join(CACHE, f), target(f));
    console.log(`MiniLM: from build cache (${REPO}@${REV})`);
    return;
  }
  const got = [];
  for (const f of FILES) got.push([f, await fetchVerified(f)]);
  for (const [f, { buf }] of got) {
    mkdirSync(dirname(join(CACHE, f)), { recursive: true });
    writeFileSync(join(CACHE, f), buf);
    mkdirSync(dirname(target(f)), { recursive: true });
    writeFileSync(target(f), buf);
  }
  console.log(`MiniLM: downloaded and verified ${REPO}@${got[0][1].commit ?? REV}`);
}

try {
  await model();
} catch (e) {
  console.warn(`MiniLM not installed (${e.message}). Search by meaning is off in this build; keyword search still works.`);
}

// 2. The ONNX runtime's WebAssembly is bundled by Vite with the worker (see src/workers/embed.worker.ts).

// 3. OCR
copy(nm('tesseract.js/dist/worker.min.js'), out('ocr/worker.min.js'));
for (const f of ['tesseract-core-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js', 'tesseract-core-relaxedsimd-lstm.wasm.js', 'tesseract-core-lstm.wasm', 'tesseract-core-simd-lstm.wasm', 'tesseract-core-relaxedsimd-lstm.wasm']) {
  if (existsSync(nm(`tesseract.js-core/${f}`))) copy(nm(`tesseract.js-core/${f}`), out(`ocr/core/${f}`));
}
copy(nm('@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz'), out('ocr/lang/eng.traineddata.gz'));
console.log('ML assets copied to public/ml');
