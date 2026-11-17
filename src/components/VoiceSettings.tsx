/* Settings: which voice reads notes aloud. */
import { useState, useSyncExternalStore } from 'react';
import { NATURAL_VOICES, deviceVoices, prepareNatural, setVoiceSettings, startListening, useListen, voiceSettings } from '../services/readAloud';
import { labelCls, quietBtn } from './ui';

const read = () => JSON.stringify(voiceSettings());

export function VoiceSettings() {
  useListen(); // re-render when the natural voice becomes ready
  const st = JSON.parse(useSyncExternalStore(() => () => {}, read)) as ReturnType<typeof voiceSettings>;
  const [, force] = useState(0);
  const [dl, setDl] = useState<string | null>(null);
  const set = (p: Parameters<typeof setVoiceSettings>[0]) => {
    setVoiceSettings(p);
    force((n) => n + 1);
  };
  const cur = voiceSettings();
  const download = async () => {
    setDl('Starting…');
    try {
      await prepareNatural((l, t) => setDl(`${Math.round(l / 1e6)} of ${Math.round(t / 1e6)} MB`));
      setDl(null);
      force((n) => n + 1);
    } catch {
      setDl(navigator.onLine ? "This device couldn't run the natural voice." : 'Connect to the internet to download it.');
    }
  };
  const sample = () =>
    startListening('Voice test', [{ id: 't', title: 'This is how Grove will read your notes', raw: '', groups: [{ kind: 'para', items: [], text: 'Supply and demand determine prices in a market economy.' }] }]);

  return (
    <section className="space-y-3 border-t border-line pt-4" aria-label="Read-aloud voice">
      <div>
        <p className={labelCls}>Read-aloud voice</p>
        <p className="text-sm text-muted">Tap Listen on any note to hear it. Works offline.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {([
          ['device', "Phone's voice", 'Instant, no download'],
          ['natural', 'Natural voice', cur.naturalReady || st.naturalReady ? 'Downloaded, runs on this device' : 'About 90 MB once, runs on this device'],
        ] as const).map(([k, label, detail]) => (
          <label key={k} className={`flex cursor-pointer items-start gap-3 rounded-2xl p-3 ring-1 ${cur.mode === k ? 'bg-raised ring-accent-text' : 'ring-edge'}`}>
            <input type="radio" name="voice-mode" checked={cur.mode === k} onChange={() => set({ mode: k })} className="mt-1 accent-[var(--color-accent)]" />
            <span>
              <span className="block text-sm font-semibold text-text">{label}</span>
              <span className="block text-xs text-muted">{detail}</span>
            </span>
          </label>
        ))}
      </div>
      {cur.mode === 'device' && deviceVoices().length > 0 && (
        <select aria-label="Phone voice" value={cur.deviceVoice || deviceVoices()[0]?.name} onChange={(e) => set({ deviceVoice: e.target.value })} className="h-11 rounded-full bg-bg/80 px-4 text-sm text-text ring-1 ring-edge">
          {deviceVoices().map((v) => <option key={v.name} value={v.name}>{v.name}</option>)}
        </select>
      )}
      {cur.mode === 'natural' && (
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Natural voice" value={cur.voice} onChange={(e) => set({ voice: e.target.value })} className="h-11 rounded-full bg-bg/80 px-4 text-sm text-text ring-1 ring-edge">
            {NATURAL_VOICES.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
          {!cur.naturalReady && (
            <button type="button" onClick={() => void download()} disabled={!!dl && dl !== "This device couldn't run the natural voice."} className={quietBtn}>
              {dl ? `Downloading: ${dl}` : 'Download now'}
            </button>
          )}
        </div>
      )}
      <button type="button" onClick={sample} className="text-sm font-medium text-accent-text hover:underline">Play a sample</button>
    </section>
  );
}
