/* One quiet line when Grove is working from this device, or when a new version is ready. */
import { useSyncExternalStore } from 'react';
import { CloudOff, RefreshCw } from 'lucide-react';
import { storage } from '../services/storage';
import { applyUpdate, usePwa } from '../services/pwa';

const ago = (t: number) => {
  if (!t) return '';
  const m = Math.round((Date.now() - t) / 60000);
  return m < 2 ? 'just now' : m < 60 ? `${m} minutes ago` : m < 48 * 60 ? `${Math.round(m / 60)} hours ago` : `${Math.round(m / 1440)} days ago`;
};

export function NetworkBanner() {
  const pwa = usePwa();
  const st = useSyncExternalStore(storage.subscribe, () => JSON.stringify(storage.status()));
  const { source, savedAt, waiting } = JSON.parse(st) as ReturnType<typeof storage.status>;
  const offline = !pwa.online || source === 'device';

  if (pwa.updateReady) {
    return (
      <div role="status" className="flex items-center justify-between gap-3 rounded-[22px] bg-surface px-4 py-3 text-sm text-text ring-1 ring-accent/50">
        <span>A new version of Grove is ready.</span>
        <button onClick={applyUpdate} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-accent px-4 font-medium text-ink">
          <RefreshCw aria-hidden className="h-4 w-4" /> Update
        </button>
      </div>
    );
  }
  if (!offline && !waiting) return null;
  return (
    <div role="status" className="flex items-start gap-3 rounded-[22px] bg-surface px-4 py-3 text-sm text-text ring-1 ring-line">
      <CloudOff aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
      <span>
        {!pwa.online ? "You're offline. " : source === 'device' ? "Grove couldn't reach the server. " : ''}
        {source === 'device' && `Showing what's saved on this device${savedAt ? ` (saved ${ago(savedAt)})` : ''}. `}
        {waiting > 0
          ? `${waiting === 1 ? 'One change is' : `${waiting} changes are`} kept here and will be sent when you're back online.`
          : !pwa.online
            ? 'You can keep reading and revising; changes are sent when you reconnect.'
            : ''}
        {pwa.online && source === 'device' && (
          <button onClick={() => window.location.reload()} className="ml-1 font-medium text-accent-text hover:underline">
            Try again
          </button>
        )}
      </span>
    </div>
  );
}
