/* Turns text into meaning vectors (all-MiniLM-L6-v2, 384 numbers) on the student's own device.
   Runs in a worker so the page never stutters; the model and runtime are served from /ml. */
import * as ort from 'onnxruntime-web/wasm';
import { Tokenizer } from '@huggingface/tokenizers';

ort.env.wasm.numThreads = 1;

let ready: Promise<{ tok: Tokenizer; session: ort.InferenceSession }> | null = null;
const load = () =>
  (ready ??= (async () => {
    const [tj, tc, model] = await Promise.all([
      fetch('/ml/minilm/tokenizer.json').then((r) => r.json()),
      fetch('/ml/minilm/tokenizer_config.json').then((r) => r.json()),
      fetch('/ml/minilm/model_quantized.onnx').then((r) => {
        if (!r.ok) throw new Error(`model ${r.status}`);
        return r.arrayBuffer();
      }),
    ]);
    const session = await ort.InferenceSession.create(new Uint8Array(model), { executionProviders: ['wasm'] });
    return { tok: new Tokenizer(tj, tc), session };
  })());

const MAX = 256;
async function embed(text: string): Promise<Float32Array> {
  const { tok, session } = await load();
  let ids = tok.encode(text).ids as number[];
  if (ids.length > MAX) ids = [...ids.slice(0, MAX - 1), ids[ids.length - 1]]; // keep the closing [SEP]
  const n = ids.length;
  const t = (a: number[]) => new ort.Tensor('int64', BigInt64Array.from(a, (x) => BigInt(x)), [1, n]);
  const out = await session.run({ input_ids: t(ids), attention_mask: t(ids.map(() => 1)), token_type_ids: t(ids.map(() => 0)) });
  const h = out[session.outputNames[0]].data as Float32Array;
  const v = new Float32Array(384);
  for (let i = 0; i < n; i++) for (let j = 0; j < 384; j++) v[j] += h[i * 384 + j];
  let norm = 0;
  for (let j = 0; j < 384; j++) norm += v[j] * v[j];
  norm = Math.sqrt(norm) || 1;
  for (let j = 0; j < 384; j++) v[j] /= norm;
  return v;
}

self.onmessage = async (e: MessageEvent<{ id: number; texts?: string[]; warm?: boolean }>) => {
  const { id, texts, warm } = e.data;
  try {
    if (warm) {
      await load();
      self.postMessage({ id, ok: true });
      return;
    }
    const vecs: Float32Array[] = [];
    for (const t of texts ?? []) vecs.push(await embed(t));
    self.postMessage({ id, ok: true, vecs }, { transfer: vecs.map((v) => v.buffer) });
  } catch (err) {
    self.postMessage({ id, ok: false, error: String(err) });
  }
};
