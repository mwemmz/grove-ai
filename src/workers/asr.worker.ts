/* Speech to text on the student's own device (Whisper, via transformers.js).
   The model is downloaded from Hugging Face the first time and kept by the browser, so later transcriptions work offline.
   Audio never leaves the device. */
import { env, pipeline, type AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers';

env.allowLocalModels = false;
env.useBrowserCache = true;
// The runtime is served by Grove itself (copied to /ml/tjs at build), so it is cached for offline use with the app.
if (env.backends.onnx.wasm) {
  env.backends.onnx.wasm.wasmPaths = '/ml/tjs/';
  env.backends.onnx.wasm.numThreads = 1;
}

type In = { type: 'load'; model: string } | { type: 'run'; id: number; audio: Float32Array };

let asr: AutomaticSpeechRecognitionPipeline | null = null;
let loaded = '';

const post = (m: unknown) => (self as unknown as Worker).postMessage(m);

self.onmessage = async (e: MessageEvent<In>) => {
  const m = e.data;
  try {
    if (m.type === 'load') {
      if (asr && loaded === m.model) return post({ type: 'ready' });
      // The pipeline() overloads are too complex for TypeScript to resolve here, so it is called through a plain signature.
      const make = pipeline as unknown as (task: string, model: string, opts: Record<string, unknown>) => Promise<unknown>;
      asr = (await make('automatic-speech-recognition', m.model, {
        dtype: 'q8',
        device: 'wasm',
        progress_callback: (p: { status: string; file?: string; loaded?: number; total?: number }) => {
          if (p.status === 'progress') post({ type: 'progress', file: p.file, loaded: p.loaded, total: p.total });
        },
      })) as AutomaticSpeechRecognitionPipeline;
      loaded = m.model;
      post({ type: 'ready' });
      return;
    }
    if (m.type === 'run') {
      if (!asr) throw new Error('The speech model is not loaded');
      const out = (await asr(m.audio, { chunk_length_s: 30, stride_length_s: 5 })) as { text: string } | { text: string }[];
      const text = Array.isArray(out) ? out.map((o) => o.text).join(' ') : out.text;
      post({ type: 'result', id: m.id, text });
    }
  } catch (err) {
    post({ type: 'error', id: (m as { id?: number }).id, message: err instanceof Error ? err.message : String(err) });
  }
};
