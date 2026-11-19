/* For admins: who is using Grove, what they were doing, and fixes for their notes (for example notes filed under the wrong course).
   Admins see names, IDs, courses, note titles, an activity log, and can open a student's notes the way the student sees them.
   They never see chat questions. Every read and change is recorded, and the student's device is told of changes so a saved copy cannot undo them. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Search, ShieldCheck } from 'lucide-react';
import { apiGet, apiPost } from '../lib/api';
import type { Note } from '../types';
import { NoteReader } from './NoteReader';
import { EmptyState } from './EmptyState';
import { field, labelCls, primaryBtn, quietBtn } from './ui';

interface Row { id: string; name: string | null; email: string | null; studentId: string | null; notes: number; lastSeen: string | null }
interface Course { id: string; code: string; name: string; year: number; semester: number }
interface NoteRow { id: string; title: string; courseId: string; size: number; updatedAt: string }
interface Activity { at: string; kind: string; detail: string | null }
interface Detail { student: { id: string; name: string | null; email: string | null; studentId: string | null; lastSignInAt: number | null }; courses: Course[]; notes: NoteRow[]; activity: Activity[]; pendingFixes: number }

const ago = (t: string | number | null) => {
  if (!t) return 'never';
  const s = Math.max(0, (Date.now() - new Date(t).getTime()) / 1000);
  if (s < 90) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
};
const KIND: Record<string, string> = { open: 'Opened Grove', tab: 'Went to', note: 'Read', upload: 'Uploaded', error: 'Error', sync: 'Saved', ask: 'Asked a question', lecture: 'Recorded a lecture', listen: 'Listened to', delete: 'Deleted', fix: 'Admin fix' };

export function StudentsAdmin() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const t = setTimeout(() => {
      apiGet<{ students: Row[] }>(`/admin?sub=students&q=${encodeURIComponent(q)}`)
        .then((d) => live && (setRows(d.students), setError('')))
        .catch((e) => live && setError(String(e.message ?? e)));
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q]);

  if (open) return <StudentDetail id={open} onBack={() => setOpen(null)} />;
  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <header className="space-y-1">
        <h2 className="font-display text-2xl text-text">Students</h2>
        <p className="flex items-start gap-2 text-sm text-muted"><ShieldCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />You can see names, IDs, courses, note titles and what a student was doing, and open their notes to fix them. Chat questions stay private. Every note you open and every fix you make is recorded.</p>
      </header>
      <label className="relative block">
        <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find a student" placeholder="Name, student ID or email" className={`${field} pl-10`} />
      </label>
      {error && <p className="text-sm text-warn">{error}</p>}
      {rows && rows.length === 0 && <EmptyState title="No students found" text="Try another name or student ID." />}
      <ul className="space-y-2">
        {rows?.map((r) => (
          <li key={r.id}>
            <button onClick={() => setOpen(r.id)} className="flex w-full items-center gap-3 rounded-2xl bg-surface p-4 text-left ring-1 ring-line hover:ring-accent-text">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-text">{r.name || r.studentId || r.email || 'Unnamed'}</span>
                <span className="block truncate font-mono text-xs text-muted">{[r.studentId, r.email].filter(Boolean).join(' · ')}</span>
              </span>
              <span className="shrink-0 text-right text-xs text-muted"><span className="block">{r.notes} notes</span><span className="block">{ago(r.lastSeen)}</span></span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StudentDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [toCode, setToCode] = useState('');
  const [toName, setToName] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<string | null>(null);

  const load = useCallback(() => {
    apiGet<Detail>(`/admin?sub=student&id=${id}`).then(setD).catch((e) => setError(String(e.message ?? e)));
  }, [id]);
  useEffect(load, [load]);

  const byCourse = useMemo(() => {
    const m = new Map<string, NoteRow[]>();
    d?.notes.forEach((n) => m.set(n.courseId, [...(m.get(n.courseId) ?? []), n]));
    return m;
  }, [d]);
  const courseOf = (cid: string) => d?.courses.find((c) => c.id === cid);
  const toggle = (nid: string) => setSel((s) => { const n = new Set(s); if (n.has(nid)) n.delete(nid); else n.add(nid); return n; });
  const selectCourse = (cid: string, on: boolean) => setSel((s) => { const n = new Set(s); (byCourse.get(cid) ?? []).forEach((x) => (on ? n.add(x.id) : n.delete(x.id))); return n; });

  const run = async (body: Record<string, unknown>, done: string) => {
    setBusy(true);
    setMsg('');
    try {
      await apiPost('/admin?sub=fix', { userId: id, ...body });
      setMsg(done);
      setSel(new Set());
      load();
    } catch (e) {
      setMsg(String((e as Error).message ?? e));
    }
    setBusy(false);
  };
  const known = d?.courses.find((c) => c.code.toUpperCase() === toCode.trim().toUpperCase());

  if (error) return <div className="p-6"><button onClick={onBack} className={quietBtn}>Back</button><p className="mt-3 text-sm text-warn">{error}</p></div>;
  if (!d) return <p className="p-6 text-sm text-muted">Loading…</p>;
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <button onClick={onBack} className="inline-flex min-h-10 items-center gap-2 text-sm text-muted hover:text-text"><ArrowLeft className="h-4 w-4" /> All students</button>
      <header>
        <h2 className="font-display text-2xl text-text">{d.student.name || d.student.studentId || 'Student'}</h2>
        <p className="font-mono text-xs text-muted">{[d.student.studentId, d.student.email].filter(Boolean).join(' · ')} · last signed in {ago(d.student.lastSignInAt)}</p>
        {d.pendingFixes > 0 && <p className="mt-1 text-sm text-warn">{d.pendingFixes} fix{d.pendingFixes > 1 ? 'es' : ''} waiting for their device. They apply the next time they open Grove.</p>}
      </header>

      {view && <AdminNote userId={id} noteId={view} who={d.student.name || d.student.studentId || 'the student'} onClose={() => { setView(null); load(); }} />}

      <section aria-label="Notes" className="space-y-3">
        <h3 className="font-display text-lg text-text">Notes by course</h3>
        {d.notes.length === 0 && <p className="text-sm text-muted">No notes saved yet.</p>}
        {[...byCourse.entries()].map(([cid, list]) => {
          const c = courseOf(cid);
          const all = list.every((n) => sel.has(n.id));
          return (
            <div key={cid} className="rounded-2xl bg-surface p-4 ring-1 ring-line">
              <label className="flex items-center gap-3 text-sm text-text">
                <input type="checkbox" checked={all} onChange={(e) => selectCourse(cid, e.target.checked)} aria-label={`Select all notes in ${c?.code ?? cid}`} className="h-4 w-4" />
                <span className="font-medium">{c ? `${c.code} · ${c.name}` : `Unknown course (${cid})`}</span>
                <span className="ml-auto text-xs text-muted">{list.length}</span>
              </label>
              <ul className="mt-3 space-y-1.5">
                {list.map((n) => (
                  <li key={n.id}>
                    <label className="flex items-center gap-3 text-sm text-muted">
                      <input type="checkbox" checked={sel.has(n.id)} onChange={() => toggle(n.id)} aria-label={n.title} className="h-4 w-4" />
                      <span className="min-w-0 flex-1 truncate text-text">{n.title}</span>
                      <span className="shrink-0 text-xs">{Math.max(1, Math.round(n.size / 1000))} KB · {ago(n.updatedAt)}</span>
                      <button type="button" onClick={(e) => { e.preventDefault(); setView(n.id); }} className="shrink-0 rounded-full bg-raised px-3 py-1 text-xs text-text ring-1 ring-line hover:bg-accent hover:text-ink">Open</button>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>

      <section aria-label="Fix" className="space-y-3 rounded-2xl bg-surface p-4 ring-1 ring-line">
        <h3 className="font-display text-lg text-text">Fix selected notes ({sel.size})</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label><span className={labelCls}>Move to course code</span>
            <input value={toCode} onChange={(e) => setToCode(e.target.value)} list="student-courses" placeholder="e.g. BIT353" className={field} />
            <datalist id="student-courses">{d.courses.map((c) => <option key={c.id} value={c.code}>{c.name}</option>)}</datalist>
          </label>
          <label><span className={labelCls}>Course name {known ? '(exists)' : '(needed if new)'}</span>
            <input value={known ? known.name : toName} disabled={!!known} onChange={(e) => setToName(e.target.value)} placeholder="e.g. E-Business" className={field} />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button disabled={busy || !sel.size || !toCode.trim()} className={`${primaryBtn} disabled:opacity-50`} onClick={() => void run({ action: 'move-notes', noteIds: [...sel], course: { code: toCode, name: known?.name ?? toName } }, `Moved ${sel.size} notes to ${toCode.toUpperCase()}.`)}>Move to {toCode.trim().toUpperCase() || 'course'}</button>
          <button disabled={busy || !sel.size} className={`${quietBtn} disabled:opacity-50`} onClick={() => confirm(`Delete ${sel.size} notes from this student's account? This cannot be undone.`) && void run({ action: 'delete-notes', noteIds: [...sel] }, `Deleted ${sel.size} notes.`)}>Delete selected</button>
        </div>
        {msg && <p role="status" className="text-sm text-text">{msg}</p>}
        <p className="text-xs text-muted">The change is saved now. Their phone or laptop picks it up the next time they open Grove, so an old copy on the device cannot undo it.</p>
      </section>

      <section aria-label="Activity" className="space-y-2">
        <h3 className="font-display text-lg text-text">What they were doing</h3>
        {d.activity.length === 0 && <p className="text-sm text-muted">Nothing recorded yet. Activity starts showing after they open this version of Grove.</p>}
        <ul className="divide-y divide-line rounded-2xl bg-surface ring-1 ring-line">
          {d.activity.map((a, i) => (
            <li key={i} className="flex gap-3 px-4 py-2.5 text-sm">
              <span className="w-20 shrink-0 text-xs text-muted">{ago(a.at)}</span>
              <span className={a.kind === 'error' ? 'text-warn' : 'text-text'}>{KIND[a.kind] ?? a.kind}{a.detail && a.kind !== 'open' ? ` · ${a.detail}` : ''}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}


/** A student's note opened the way they see it, with the tools to fix it. Reads and edits are recorded. */
function AdminNote({ userId, noteId, who, onClose }: { userId: string; noteId: string; who: string; onClose: () => void }) {
  const [note, setNote] = useState<Note | null>(null);
  const [err, setErr] = useState('');
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    apiGet<{ note: Note }>(`/admin?sub=note&userId=${userId}&id=${encodeURIComponent(noteId)}`)
      .then(({ note: n }) => { setNote(n); setTitle(n.title); setText(n.content); })
      .catch((e) => setErr(String(e.message ?? e)));
  }, [userId, noteId]);
  const save = async () => {
    if (!note) return;
    setBusy(true);
    setMsg('');
    try {
      await apiPost('/admin?sub=fix', { userId, action: 'edit-note', noteId, title: title.trim() !== note.title ? title.trim() : undefined, content: text !== note.content ? text : undefined });
      setNote({ ...note, title: title.trim() || note.title, content: text });
      setEditing(false);
      setMsg('Saved. Their device picks it up the next time they open Grove.');
    } catch (e) {
      setMsg(String((e as Error).message ?? e));
    }
    setBusy(false);
  };
  return (
    <>
      {note && !editing && <NoteReader key={note.content.length + note.title} note={note} onClose={onClose} />}
      <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-line bg-surface px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2 text-sm">
          <ShieldCheck aria-hidden className="h-4 w-4 shrink-0 text-accent" />
          <span className="min-w-0 flex-1 truncate text-text">Viewing {who}'s note as admin{msg ? ` · ${msg}` : ''}</span>
          {err && <span className="text-warn">{err}</span>}
          {note && !editing && <button onClick={() => setEditing(true)} className={quietBtn}>Edit title and text</button>}
          <button onClick={onClose} className={quietBtn}>Close</button>
        </div>
      </div>
      {editing && note && (
        <div role="dialog" aria-label="Edit note" className="fixed inset-0 z-50 flex flex-col gap-3 overflow-y-auto bg-bg p-4 pb-24 sm:p-6">
          <h3 className="font-display text-xl text-text">Edit {who}'s note</h3>
          <label><span className={labelCls}>Title</span><input value={title} onChange={(e) => setTitle(e.target.value)} className={field} /></label>
          <label className="flex min-h-0 flex-1 flex-col"><span className={labelCls}>Text (use ## for headings, ### for sub-headings, - for bullets)</span>
            <textarea value={text} onChange={(e) => setText(e.target.value)} className={`${field} min-h-[50vh] flex-1 font-mono text-xs leading-5`} />
          </label>
          <div className="flex gap-2">
            <button disabled={busy || !title.trim() || !text.trim()} onClick={() => void save()} className={`${primaryBtn} disabled:opacity-50`}>Save for the student</button>
            <button onClick={() => { setEditing(false); setTitle(note.title); setText(note.content); }} className={quietBtn}>Cancel</button>
          </div>
        </div>
      )}
    </>
  );
}
