/* For Grove admins only: set the AI key Grove uses for every student who has not added their own.
   The key is stored encrypted on the server and is never shown again, only its last four characters. */
import { useEffect, useState } from 'react';
import { apiDelete, apiGet, apiPost } from '../lib/api';
import { getMe } from '../services/packs';
import { field, labelCls, primaryBtn, quietBtn } from './ui';

interface Status {
  configured: boolean;
  source: 'app' | 'env' | null;
  provider: string | null;
  model: string | null;
  daily: number;
  keyEnd: string | null;
  updatedBy: string | null;
  providers: { id: string; label: string; model: string; keyHint: string; keyUrl: string | null }[];
}

export function GroveAiAdmin() {
  const [admin, setAdmin] = useState(false);
  const [st, setSt] = useState<Status | null>(null);
  const [provider, setProvider] = useState('groq');
  const [key, setKey] = useState('');
  const [model, setModel] = useState('');
  const [daily, setDaily] = useState('40');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const apply = (s: Status) => {
    setSt(s);
    if (s.provider) setProvider(s.provider);
    setModel(s.model ?? '');
    setDaily(String(s.daily));
  };
  useEffect(() => {
    getMe()
      .then((me) => {
        setAdmin(me.admin);
        if (me.admin) void apiGet<Status>('/admin/ai').then(apply).catch(() => {});
      })
      .catch(() => setAdmin(false));
  }, []);
  if (!admin || !st) return null;

  const def = st.providers.find((p) => p.id === provider);
  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      setMsg({ ok: false, text: String((e as Error).message ?? e).replace(/^API request failed \(\d+\): /, '') });
    }
    setBusy(false);
  };

  return (
    <section className="space-y-3 border-t border-line pt-4" aria-label="Grove's own AI">
      <p className={labelCls}>Grove's own AI · admin</p>
      <p className="text-sm text-muted">
        This key answers for every student who has not added their own. It is stored encrypted on the server and cannot be read back. Each student gets a daily allowance.
      </p>
      <p className="text-sm text-text" role="status">
        {st.configured ? `On: ${st.providers.find((p) => p.id === st.provider)?.label ?? st.provider}, ${st.model}, key ending ${st.keyEnd}. ${st.source === 'env' ? 'Set in the server settings (environment).' : 'Set here.'}` : 'Off: students without their own key get answers from their notes only.'}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className={labelCls}>Provider</span>
          <select value={provider} onChange={(e) => { setProvider(e.target.value); setModel(st.providers.find((p) => p.id === e.target.value)?.model ?? ''); }} className={field}>
            {st.providers.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </label>
        <label>
          <span className={labelCls}>Model</span>
          <input value={model} onChange={(e) => setModel(e.target.value)} placeholder={def?.model} className={field} autoComplete="off" />
        </label>
        <label className="sm:col-span-2">
          <span className={labelCls}>API key {st.configured && st.provider === provider ? '(leave empty to keep the current one)' : ''}</span>
          <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder={def?.keyHint ?? ''} className={field} autoComplete="new-password" spellCheck={false} />
          {def?.keyUrl && <a href={def.keyUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-muted underline">Get a {def.label} key</a>}
        </label>
        <label>
          <span className={labelCls}>Answers per student per day</span>
          <input type="number" min={1} max={1000} value={daily} onChange={(e) => setDaily(e.target.value)} className={field} />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          disabled={busy || (!key && !(st.configured && st.provider === provider))}
          className={`${primaryBtn} disabled:opacity-50`}
          onClick={() => act(async () => {
            apply(await apiPost<Status>('/admin/ai', { provider, key, model, daily: Number(daily) }));
            setKey('');
            const t = await apiPost<{ ok: boolean; message: string }>('/admin/ai', { test: true });
            setMsg({ ok: t.ok, text: t.ok ? `Saved. ${t.message}` : `Saved, but the test failed: ${t.message}` });
          })}
        >
          {busy ? 'Saving…' : 'Save and test'}
        </button>
        {st.configured && (
          <button disabled={busy} className={`${quietBtn} disabled:opacity-50`} onClick={() => act(async () => { const t = await apiPost<{ ok: boolean; message: string }>('/admin/ai', { test: true }); setMsg({ ok: t.ok, text: t.message }); })}>Test</button>
        )}
        {st.configured && st.source === 'app' && (
          <button disabled={busy} className={`${quietBtn} disabled:opacity-50`} onClick={() => confirm("Turn off Grove's own AI? Students without their own key will get answers from their notes only.") && act(async () => { apply(await apiDelete<Status>('/admin/ai')); setMsg({ ok: true, text: 'Removed.' }); })}>Remove key</button>
        )}
      </div>
      {msg && <p className={`text-sm ${msg.ok ? 'text-accent' : 'text-warn'}`} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>}
    </section>
  );
}
