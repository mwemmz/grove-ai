/* The natural read-aloud voice (Kokoro-82M, Apache-2.0), run on the student's own device with transformers.js.
   The model (about 90 MB) is downloaded from Hugging Face the first time and kept by the browser. */
import { env } from '@huggingface/transformers';
import { KokoroTTS } from 'kokoro-js';

env.allowLocalModels = false;
if (env.backends.onnx.wasm) {
  env.backends.onnx.wasm.wasmPaths = '/ml/tjs/';
  env.backends.onnx.wasm.numThreads = 1;
}

const MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';
type In = { type: 'load' } | { type: 'speak'; id: number; text: string; voice: string; speed: number };

let tts: Promise<KokoroTTS> | null = null;
const post = (m: unknown, t?: Transferable[]) => (self as unknown as Worker).postMessage(m, t ?? []);

const load = () =>
  (tts ??= KokoroTTS.from_pretrained(MODEL, {
    dtype: 'q8',
    device: 'wasm',
    progress_callback: (p: { status: string; file?: string; loaded?: number; total?: number }) => {
      if (p.status === 'progress') post({ type: 'progress', file: p.file, loaded: p.loaded, total: p.total });
    },
  } as Parameters<typeof KokoroTTS.from_pretrained>[1]));

self.onmessage = async (e: MessageEvent<In>) => {
  const m = e.data;
  try {
    if (m.type === 'load') {
      await load();
      post({ type: 'ready' });
      return;
    }
    const model = await load();
    const audio = await model.generate(m.text, { voice: m.voice as never, speed: m.speed });
    const data = audio.audio as Float32Array;
    post({ type: 'audio', id: m.id, data, rate: audio.sampling_rate }, [data.buffer]);
  } catch (err) {
    tts = null;
    post({ type: 'error', id: (m as { id?: number }).id, message: err instanceof Error ? err.message : String(err) });
  }
};
