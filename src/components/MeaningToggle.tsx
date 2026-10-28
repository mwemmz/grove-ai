/* Settings: the on-device meaning search, its status, and a switch for students on tight data. */
import { setMeaningEnabled, useMeaningState, warmUp } from '../services/semantic';
import { labelCls } from './ui';

const STATUS: Record<string, string> = {
  off: 'Off. Grove matches the words in your question.',
  idle: 'Waiting for a good connection to download (about 40 MB, once).',
  loading: 'Downloading and starting… (about 40 MB, once)',
  ready: 'On. Grove understands what you mean, not just the words you type.',
  error: 'Could not start on this device. Grove is using word matching.',
};

export function MeaningToggle() {
  const st = useMeaningState();
  const on = st !== 'off';
  return (
    <section className="space-y-2 border-t border-line pt-4" aria-label="Search by meaning">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className={labelCls}>Search by meaning</p>
          <p className="text-sm text-muted" role="status">{STATUS[st]}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Search by meaning"
          onClick={() => setMeaningEnabled(!on)}
          className={`relative h-7 w-12 shrink-0 rounded-full ring-1 transition-colors ${on ? 'bg-accent ring-accent' : 'bg-raised ring-edge'}`}
        >
          <span className={`absolute top-1 h-5 w-5 rounded-full transition-transform duration-200 ${on ? 'translate-x-6 bg-ink' : 'translate-x-1 bg-muted'}`} style={{ left: 0 }} />
        </button>
      </div>
      {st === 'idle' && (
        <button type="button" onClick={() => void warmUp(true)} className="text-sm font-medium text-accent-text hover:underline">
          Download now
        </button>
      )}
    </section>
  );
}
