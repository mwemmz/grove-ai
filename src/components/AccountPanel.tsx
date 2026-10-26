/* Who is signed in, where, and the controls to end sessions. Sessions are Clerk's; this only lists and revokes them. */
import { useEffect, useState } from 'react';
import { useClerk, useSession, useUser } from '@clerk/react';
import { field, labelCls, quietBtn } from './ui';

interface SessionRow {
  id: string;
  lastActiveAt: Date;
  latestActivity?: { browserName?: string; deviceType?: string; city?: string; country?: string; isMobile?: boolean };
  revoke: () => Promise<unknown>;
}

const when = (d: Date) => {
  const mins = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 2) return 'active now';
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(d).toLocaleDateString();
};

export function AccountPanel() {
  const { user } = useUser();
  const { session } = useSession();
  const { signOut } = useClerk();
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pw, setPw] = useState({ current: '', next: '' });
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let live = true;
    user
      ?.getSessions()
      .then((list) => live && setSessions(list as unknown as SessionRow[]))
      .catch(() => live && setError('Could not load your sessions.'));
    return () => {
      live = false;
    };
  }, [user]);

  if (!user) return null;
  const email = user.primaryEmailAddress?.emailAddress;

  const savePassword = async () => {
    setPwMsg(null);
    if (pw.next.length < 8) return setPwMsg({ ok: false, text: 'Use at least 8 characters.' });
    setBusy('pw');
    try {
      await user.updatePassword(user.passwordEnabled ? { currentPassword: pw.current, newPassword: pw.next } : { newPassword: pw.next });
      setPw({ current: '', next: '' });
      setPwMsg({ ok: true, text: 'Password saved. You can now sign in with your email or student ID and this password.' });
    } catch (err) {
      const e = err as { errors?: { longMessage?: string; message?: string }[] };
      setPwMsg({ ok: false, text: e.errors?.[0]?.longMessage || e.errors?.[0]?.message || 'Could not save the password.' });
    } finally {
      setBusy(null);
    }
  };

  const revoke = async (s: SessionRow) => {
    setBusy(s.id);
    setError(null);
    try {
      await s.revoke();
      setSessions((list) => list?.filter((x) => x.id !== s.id) ?? null);
    } catch {
      setError('Could not sign out that device. Try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="space-y-3 border-t border-line pt-4" aria-label="Your account">
      <p className={labelCls}>Your account</p>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-muted">Name</dt>
          <dd className="text-text">{user.fullName || '–'}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Email</dt>
          <dd className="break-all text-text">{email || '–'}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Student ID</dt>
          <dd className="font-mono text-text">{user.username || '–'}</dd>
        </div>
      </dl>

      <div className="space-y-2">
        <p className="text-xs text-muted">{user.passwordEnabled ? 'Change password' : 'Set a password (this account has none yet)'}</p>
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          {user.passwordEnabled && (
            <input type="password" autoComplete="current-password" aria-label="Current password" placeholder="Current password" className={field} value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
          )}
          <input type="password" autoComplete="new-password" aria-label="New password" placeholder="New password" className={field} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
          <button type="button" onClick={savePassword} disabled={busy === 'pw'} className={`${quietBtn} !min-h-10 !px-3 text-sm`}>
            {busy === 'pw' ? 'Saving…' : 'Save password'}
          </button>
        </div>
        {pwMsg && <p className={`text-sm ${pwMsg.ok ? 'text-accent' : 'text-warn'}`} role={pwMsg.ok ? 'status' : 'alert'}>{pwMsg.text}</p>}
      </div>

      <div>
        <p className="text-xs text-muted">Signed in on</p>
        {!sessions && !error && <p className="text-sm text-muted" role="status">Loading…</p>}
        {sessions && (
          <ul className="divide-y divide-line">
            {sessions.map((s) => {
              const a = s.latestActivity ?? {};
              const device = [a.browserName, a.deviceType || (a.isMobile ? 'phone' : undefined)].filter(Boolean).join(' on ') || 'Unknown device';
              const place = [a.city, a.country].filter(Boolean).join(', ');
              const current = s.id === session?.id;
              return (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span className="text-text">
                    {device}
                    {place ? <span className="text-muted"> · {place}</span> : null}
                    <span className="text-muted"> · {current ? 'this device' : when(s.lastActiveAt)}</span>
                  </span>
                  {!current && (
                    <button type="button" onClick={() => revoke(s)} disabled={busy === s.id} className={`${quietBtn} !min-h-8 !px-3 text-xs`}>
                      {busy === s.id ? 'Signing out…' : 'Sign out this device'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {error && <p className="text-sm text-warn" role="alert">{error}</p>}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void signOut()} className={`${quietBtn} !min-h-9 !px-3 text-sm`}>
          Sign out
        </button>
        {sessions && sessions.length > 1 && (
          <button
            type="button"
            onClick={async () => {
              for (const s of sessions.filter((x) => x.id !== session?.id)) await s.revoke().catch(() => undefined);
              void signOut();
            }}
            className={`${quietBtn} !min-h-9 !px-3 text-sm`}
          >
            Sign out everywhere
          </button>
        )}
      </div>
    </section>
  );
}
