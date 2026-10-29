/* A picture in a note: the slide diagram or figure, shown where it belongs in the notes.
   Tap it to see it full screen, where it can be zoomed (pinch on phones, scroll or +/- on computers). */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ImageOff, Maximize2, Minus, Plus, X } from 'lucide-react';
import { loadFigure } from '../services/figures';

export function Figure({ refId, caption }: { refId: string; caption?: string }) {
  const [src, setSrc] = useState<string | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLButtonElement>(null);

  // Fetch only when the picture comes near the screen: a long note never downloads pictures nobody scrolls to.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let live = true;
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          io.disconnect();
          void loadFigure(refId).then((d) => live && setSrc(d));
        }
      },
      { rootMargin: '600px 0px' },
    );
    io.observe(el);
    return () => {
      live = false;
      io.disconnect();
    };
  }, [refId]);

  const missing = src === null;
  return (
    <figure className="my-1">
      <button
        ref={box}
        type="button"
        disabled={!src}
        onClick={() => setOpen(true)}
        aria-label={caption ? `Enlarge: ${caption}` : 'Enlarge picture'}
        className="group relative block w-full overflow-hidden rounded-2xl bg-white ring-1 ring-line disabled:cursor-default disabled:opacity-100"
      >
        {src ? (
          <img src={src} alt={caption ?? 'Slide picture'} className="animate-fade-in mx-auto block max-h-[440px] w-auto max-w-full object-contain" />
        ) : (
          <div className={`flex aspect-[16/9] items-center justify-center bg-raised ${missing ? '' : 'animate-pulse'}`}>
            {missing && (
              <span className="flex items-center gap-2 px-4 text-center text-sm text-muted">
                <ImageOff aria-hidden className="h-4 w-4 shrink-0" />
                {refId.startsWith('figure:local/') ? 'This picture was added on another device.' : 'Picture unavailable offline. It will load when you are back online.'}
              </span>
            )}
          </div>
        )}
        {src && (
          <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <Maximize2 aria-hidden className="h-4 w-4" />
          </span>
        )}
      </button>
      {caption && <figcaption className="mt-1.5 text-center text-sm text-muted">{caption}</figcaption>}
      {open && src && <Viewer src={src} caption={caption} onClose={() => setOpen(false)} />}
    </figure>
  );
}

function Viewer({ src, caption, onClose }: { src: string; caption?: string; onClose: () => void }) {
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        onClose();
      }
      if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(4, z + 0.5));
      if (e.key === '-') setZoom((z) => Math.max(1, z - 0.5));
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={caption ?? 'Picture'} className="animate-fade-in fixed inset-0 z-[70] flex flex-col bg-black/90">
      <div className="flex items-center gap-2 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-white">
        <p className="min-w-0 flex-1 truncate text-sm">{caption}</p>
        <button onClick={() => setZoom((z) => Math.max(1, z - 0.5))} aria-label="Zoom out" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><Minus className="h-4 w-4" /></button>
        <button onClick={() => setZoom((z) => Math.min(4, z + 0.5))} aria-label="Zoom in" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><Plus className="h-4 w-4" /></button>
        <button onClick={onClose} aria-label="Close picture" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><X className="h-5 w-5" /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto overscroll-contain" style={{ touchAction: 'pan-x pan-y pinch-zoom' }} onClick={(e) => e.target === e.currentTarget && onClose()}>
        <img
          src={src}
          alt={caption ?? 'Picture'}
          onDoubleClick={() => setZoom((z) => (z > 1 ? 1 : 2))}
          className="mx-auto block rounded-lg bg-white transition-[width] duration-200"
          style={{ width: `${zoom * 100}%`, maxWidth: zoom === 1 ? 'min(100%, 1200px)' : 'none' }}
        />
      </div>
    </div>,
    document.body,
  );
}
