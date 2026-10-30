/* Grove as an installable app: the service worker that keeps it working offline, updates, and the install prompt. */
import { useSyncExternalStore } from 'react';

type State = { updateReady: boolean; canInstall: boolean; installed: boolean; online: boolean };
let state: State = {
  updateReady: false,
  canInstall: false,
  installed: typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true),
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
};
const subs = new Set<() => void>();
const set = (p: Partial<State>) => {
  state = { ...state, ...p };
  subs.forEach((f) => f());
};
export const usePwa = () =>
  useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => state,
  );

let waiting: ServiceWorker | null = null;
let deferred: (Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }) | null = null;

export function startPwa(): void {
  window.addEventListener('online', () => set({ online: true }));
  window.addEventListener('offline', () => set({ online: false }));
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as typeof deferred;
    set({ canInstall: true });
  });
  window.addEventListener('appinstalled', () => set({ installed: true, canInstall: false }));

  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        const watch = (w: ServiceWorker | null) => {
          if (!w) return;
          w.addEventListener('statechange', () => {
            // A new version is ready, and an older one is running this page: offer to switch rather than reload mid-study.
            if (w.state === 'installed' && navigator.serviceWorker.controller) {
              waiting = w;
              set({ updateReady: true });
            }
          });
        };
        if (reg.waiting && navigator.serviceWorker.controller) {
          waiting = reg.waiting;
          set({ updateReady: true });
        }
        reg.addEventListener('updatefound', () => watch(reg.installing));
        setInterval(() => void reg.update().catch(() => {}), 60 * 60 * 1000);
      })
      .catch(() => {});
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
  });
}

/** Switch to the new version. The page reloads, and the address keeps the student on the same screen. */
export function applyUpdate(): void {
  if (waiting) waiting.postMessage({ type: 'SKIP_WAITING' });
  else window.location.reload();
}

/** Android and desktop Chrome/Edge: show the browser's own "Install Grove" prompt. */
export async function install(): Promise<boolean> {
  if (!deferred) return false;
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  set({ canInstall: false, installed: outcome === 'accepted' || state.installed });
  return outcome === 'accepted';
}

export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
