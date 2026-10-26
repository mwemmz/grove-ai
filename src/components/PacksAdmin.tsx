/* For Grove admins only: publish a notes pack so the server delivers it to the students it is meant for. */
import { useEffect, useRef, useState } from 'react';
import { getMe, listPacks, publishPack, removePack, type PackSummary } from '../services/packs';
import { labelCls, quietBtn } from './ui';

export function PacksAdmin() {
  const [admin, setAdmin] = useState(false);
  const [packs, setPacks] = useState<PackSummary[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => listPacks().then(setPacks).catch(() => setPacks([]));
  useEffect(() => {
    getMe()
      .then((me) => {
        setAdmin(me.admin);
        if (me.admin) void refresh();
      })
      .catch(() => setAdmin(false));
  }, []);

  if (!admin) return null;

  const publish = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const raw = JSON.parse(await file.text()) as { grove?: string; course?: { code?: string } };
      const code = raw.course?.code?.toUpperCase();
      if (raw.grove !== 'notes-pack' || !code) throw new Error('That file is not a Grove notes pack.');
      const r = await publishPack(code, raw);
      setMsg({ ok: true, text: `Published ${r.notes} ${code} notes${r.audience ? `, for student IDs starting with ${r.audience}` : ', for everyone'}.` });
      await refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Could not publish the pack.' });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <section className="space-y-3 border-t border-line pt-4" aria-label="Notes packs">
      <p className={labelCls}>Notes packs · admin</p>
      <p className="text-sm text-muted">
        Published packs are stored on Grove’s server and added automatically for the students they are meant for. Students outside the audience can’t download them.
      </p>
      {packs.length > 0 && (
        <ul className="divide-y divide-line">
          {packs.map((p) => (
            <li key={p.code} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <span className="text-text">
                <span className="font-mono">{p.code}</span> · {p.name} · {p.notes} notes
                <span className="text-muted"> · {p.audience ? `IDs starting ${p.audience}` : 'everyone'}</span>
              </span>
              <button
                type="button"
                className={`${quietBtn} !min-h-8 !px-3 text-xs`}
                onClick={async () => {
                  await removePack(p.code).catch(() => undefined);
                  void refresh();
                }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <label className={`${quietBtn} !min-h-9 cursor-pointer !px-3 text-sm`}>
        {busy ? 'Publishing…' : 'Publish a notes pack (.json)'}
        <input ref={fileRef} type="file" accept=".json,application/json" className="sr-only" onChange={(e) => publish(e.target.files?.[0])} />
      </label>
      {msg && <p className={`text-sm ${msg.ok ? 'text-accent' : 'text-warn'}`} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>}
    </section>
  );
}
