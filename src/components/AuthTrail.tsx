/* Admins only: the sign-in trail. Shows each step students took on the sign-in screen and what went wrong,
   and can look an account up in Clerk (does it exist, which email, is it verified, has it a password). */
import { useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, Search, XCircle } from 'lucide-react';
import { apiGet } from '../lib/api';
import { getMe } from '../services/packs';
import { field, labelCls, quietBtn } from './ui';

interface Ev { id: number; at: string; flow: string; step: string; ok: boolean; code: string | null; message: string | null; who: string | null; device: string | null }
interface Account {
  name: string | null;
  studentId: string | null;
  emails: { address: string; verified: boolean; primary: boolean }[];
  hasPassword: boolean;
  createdAt: number;
  lastSignInAt: number | null;
  banned: boolean;
  locked: boolean;
}

const when = (iso: string | number) => {
  const d = new Date(iso);
  return d.toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

/** What the error usually means, in plain words, for the ones that matter when "the code never came". */
const HINT: Record<string, string> = {
  form_identifier_not_found: 'No account with that email or student ID. They may have typed it differently, or never finished signing up.',
  too_many_requests: 'Clerk is rate-limiting this person. Ask them to wait a few minutes before asking for another code.',
  strategy_for_user_invalid: 'The account has no password. They should use "Sign in with an emailed code".',
  form_password_incorrect: 'Wrong password. "Forgot password?" sends a reset code.',
  verification_expired: 'The code expired before it was entered. They should send a new one.',
  form_code_incorrect: 'The code was typed wrong, or an older code was used after a newer one was sent.',
};

export function AuthTrail() {
  const [admin, setAdmin] = useState(false);
  const [q, setQ] = useState('');
  const [events, setEvents] = useState<Ev[]>([]);
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async (who = q, lookup = false) => {
    setBusy(true);
    setErr(null);
    try {
      const r = await apiGet<{ events: Ev[]; account?: Account[] }>(`/auth-log?who=${encodeURIComponent(who.trim())}${lookup && who.trim() ? '&lookup=1' : ''}`);
      setEvents(Array.isArray(r?.events) ? r.events : []);
      setAccounts(lookup ? (Array.isArray(r?.account) ? r.account : []) : null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load the trail.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    getMe()
      .then((m) => {
        setAdmin(m.admin);
        if (m.admin) void load('');
      })
      .catch(() => setAdmin(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!admin) return null;

  return (
    <section className="space-y-3 border-t border-line pt-4" aria-label="Sign-in trail">
      <p className={labelCls}>Sign-in trail · admin</p>
      <p className="text-sm text-muted">
        Every step on the sign-in screen from the last 30 days. Search a student's email or ID to see their attempts and check their account.
      </p>
      {/* Not a <form>: this sits inside the Settings form, and forms can't nest. */}
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void load(q, true);
            }
          }}
          placeholder="Email or student ID"
          aria-label="Email or student ID"
          className={field}
        />
        <button type="button" onClick={() => void load(q, true)} className={quietBtn} disabled={busy}>
          <Search className="h-4 w-4" /> Check
        </button>
        <button type="button" onClick={() => void load(q)} aria-label="Refresh" className={quietBtn} disabled={busy}>
          <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
        </button>
      </div>
      {err && <p className="text-sm text-warn" role="alert">{err}</p>}

      {accounts && (
        <div className="space-y-2">
          {accounts.length === 0 ? (
            <p className="rounded-2xl bg-raised px-4 py-3 text-sm text-text">No Grove account matches “{q}”. They need to create one first, or they typed a different email.</p>
          ) : (
            accounts.map((a, i) => (
              <div key={i} className="rounded-2xl bg-raised px-4 py-3 text-sm text-text ring-1 ring-line">
                <p className="font-semibold">{a.name || 'No name'} {a.studentId && <span className="font-mono text-xs text-muted">· {a.studentId}</span>}</p>
                <ul className="mt-1 space-y-0.5">
                  {a.emails.map((e) => (
                    <li key={e.address} className="flex items-center gap-1.5">
                      {e.verified ? <CheckCircle2 className="h-3.5 w-3.5 text-accent-text" /> : <XCircle className="h-3.5 w-3.5 text-warn" />}
                      {e.address} <span className="text-xs text-muted">{e.verified ? 'verified' : 'not verified'}{e.primary ? ', primary' : ''}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-xs text-muted">
                  {a.hasPassword ? 'Has a password' : 'No password set'} · created {when(a.createdAt)} · {a.lastSignInAt ? `last signed in ${when(a.lastSignInAt)}` : 'never signed in'}
                  {a.banned && ' · banned'}
                  {a.locked && ' · locked after too many attempts'}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {events.length === 0 ? (
        <p className="text-sm text-muted">{busy ? 'Loading…' : 'Nothing recorded yet.'}</p>
      ) : (
        <ul className="max-h-80 space-y-1 overflow-y-auto pr-1">
          {events.map((e) => (
            <li key={e.id} className="rounded-xl px-3 py-2 text-sm hover:bg-raised/60">
              <div className="flex items-start gap-2">
                {e.ok ? <CheckCircle2 aria-label="worked" className="mt-0.5 h-4 w-4 shrink-0 text-accent-text" /> : <XCircle aria-label="failed" className="mt-0.5 h-4 w-4 shrink-0 text-warn" />}
                <div className="min-w-0 flex-1">
                  <p className="text-text">
                    <span className="font-medium">{e.step}</span>
                    {e.who && <span className="text-muted"> · {e.who}</span>}
                  </p>
                  <p className="text-xs text-muted">
                    {when(e.at)} · {e.device ?? 'unknown device'}
                    {e.code && <> · <span className="font-mono">{e.code}</span></>}
                  </p>
                  {!e.ok && (HINT[e.code ?? ''] || e.message) && <p className="mt-0.5 text-xs text-text/80">{HINT[e.code ?? ''] || e.message}</p>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
