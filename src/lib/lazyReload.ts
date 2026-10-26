import { lazy, type ComponentType } from 'react';

/* After a new deploy, a tab opened earlier still asks for the old file names, which no longer exist (404).
   When a lazily loaded part of the app fails like that, reload the page once to pick up the new version. */
const KEY = 'grove_chunk_reload';

export function lazyWithReload<T extends ComponentType<any>>(load: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      const mod = await load();
      try { sessionStorage.removeItem(KEY); } catch { /* storage may be unavailable */ }
      return mod;
    } catch (err) {
      let already = false;
      try { already = sessionStorage.getItem(KEY) === '1'; sessionStorage.setItem(KEY, '1'); } catch { /* ignore */ }
      if (!already) {
        window.location.reload();
        return new Promise<{ default: T }>(() => {}); // wait for the reload
      }
      throw err;
    }
  });
}
