import { lazyWithReload } from '../lib/lazyReload';
import React, { Suspense, useRef, useState } from 'react';
import { FileUp } from 'lucide-react';
import { Note, Course, AcademicYear } from '../types';
import { storage } from '../services/storage';
import { ACCEPT, extractText } from '../services/fileText';
import { Modal, Inline, field, labelCls, primaryBtn, panel } from './ui';
import { placePictures } from '../data/pictureMatch';
import type { TopicId } from '../data/visualTopics';
import { mergePack, parseNotesPack } from '../services/notesPack';
import { COURSE_AUDIENCE, canSee, getStudentId } from '../services/access';

const VisualCard = lazyWithReload(() => import('./VisualCard'));

interface DegreeMemoryViewProps {
  notes: Note[];
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  courses: Course[];
  selectedNoteForDetail: Note | null;
  /** Adds a course if a notes pack brings one the student doesn't have yet. */
  onAddCourse?: (course: Course) => void;
  /** Opens a picture in the Visuals tab. */
  onOpenVisual?: (id: TopicId) => void;
  setSelectedNoteForDetail: (note: Note | null) => void;
}

const STOP = new Set('the a an and or of to in on for with is are was were be been it its this that these those as at by from into than then so if but not can will just about over under how what why when where which who do does did have has had my our your their use used using like each other such very'.split(' '));

/** Pick up to four of the most repeated meaningful words as tags. */
function autoTags(text: string): string[] {
  const freq: Record<string, number> = {};
  for (const w of text.toLowerCase().match(/[a-z][a-z0-9+#-]{2,}/g) ?? []) {
    if (!STOP.has(w)) freq[w] = (freq[w] ?? 0) + 1;
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, 4)
    .map(([w]) => w);
}

function renderPara(para: string, idx: number) {
  if (para.startsWith('# ')) return <h3 key={idx} className="pt-2 text-lg font-semibold">{para.replace('# ', '')}</h3>;
  if (para.startsWith('### ')) {
    // A slide: its title, then its lines.
    const [head, ...rest] = para.split('\n');
    return (
      <div key={idx} className="space-y-1">
        <h4 className="pt-1 text-base font-semibold">{head.replace('### ', '')}</h4>
        {rest.length > 0 && <p className="whitespace-pre-wrap"><Inline text={rest.join('\n')} /></p>}
      </div>
    );
  }
  if (para.startsWith('```')) {
    const code = para.split('\n').slice(1, -1).join('\n');
    return (
      <pre key={idx} className="overflow-x-auto rounded-lg bg-bg p-4 font-mono text-[13px] leading-6">
        <code>{code}</code>
      </pre>
    );
  }
  return <p key={idx} className="whitespace-pre-wrap"><Inline text={para} /></p>;
}

export const DegreeMemoryView: React.FC<DegreeMemoryViewProps> = ({
  notes,
  setNotes,
  courses,
  selectedNoteForDetail,
  setSelectedNoteForDetail,
  onAddCourse,
  onOpenVisual,
}) => {
  const [query, setQuery] = useState('');
  const [saved, setSaved] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newCourseId, setNewCourseId] = useState(courses[0]?.id || '');
  const [newYear, setNewYear] = useState<AcademicYear>(4);
  const [newContent, setNewContent] = useState('');

  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [reading, setReading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const q = query.trim().toLowerCase();
  const filtered = notes.filter((n) => {
    if (!q) return true;
    return (
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const courseOf = (id: string) => courses.find((c) => c.id === id);

  const makeNote = (title: string, content: string, i = 0): Note => {
    const course = courseOf(newCourseId);
    const now = new Date().toISOString();
    return {
      id: `note-${Date.now()}-${i}`,
      courseId: newCourseId,
      year: course ? course.year : newYear,
      title: title.trim(),
      content: content.trim(),
      summary: content.trim().replace(/\s+/g, ' ').slice(0, 140),
      tags: autoTags(`${title} ${content}`),
      keyTakeaways: [],
      createdAt: now,
      updatedAt: now,
      masteryScore: 85,
    };
  };

  /** One file fills the form so it can be reviewed; several files are saved straight away. */
  const handleFiles = async (list: FileList | File[]) => {
    const files = Array.from(list);
    if (!files.length) return;
    setReading(true);
    setUploadMsg(null);
    const done: { title: string; text: string; truncated: boolean }[] = [];
    const problems: string[] = [];
    // A Grove notes pack (.json) brings a whole course at once: add it and its notes directly.
    for (const f of files.filter((x) => x.name.toLowerCase().endsWith('.json'))) {
      const pack = parseNotesPack(await f.text().catch(() => ''));
      if (!pack) continue;
      files.splice(files.indexOf(f), 1);
      const need = pack.audience ?? COURSE_AUDIENCE[pack.course.code.toUpperCase()];
      if (!canSee(need)) {
        setReading(false);
        setUploadMsg({
          ok: false,
          text: `These ${pack.course.code} notes are only for students whose ID starts with ${need}. ${getStudentId() ? `Your student ID is ${getStudentId()}.` : 'Your account has no student ID.'}`,
        });
        if (fileRef.current) fileRef.current.value = '';
        return;
      }
      const merged = mergePack(pack, notes, courses);
      if (merged.newCourse) onAddCourse?.(merged.course);
      const fresh = { length: merged.added };
      const updated = merged.notes;
      setNotes(updated);
      storage.saveNotes(updated);
      setReading(false);
      setUploadMsg({
        ok: true,
        text:
          fresh.length === 0
            ? `All ${pack.notes.length} ${pack.course.code} notes are already here.`
            : `Added ${fresh.length} ${pack.course.code} notes${pack.notes.length > fresh.length ? ` (${pack.notes.length - fresh.length} were already here)` : ''}. Open one to see the pictures beside the slides.`,
      });
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    for (const f of files) {
      try {
        done.push(await extractText(f));
      } catch (err) {
        problems.push(err instanceof Error ? err.message : `${f.name}: could not be read.`);
      }
    }
    setReading(false);
    if (done.length === 1) {
      setNewTitle(done[0].title);
      setNewContent(done[0].text);
    } else if (done.length > 1) {
      const created = done.map((d, i) => makeNote(d.title, d.text, i));
      const updated = [...created, ...notes];
      setNotes(updated);
      storage.saveNotes(updated);
    }
    const trunc = done.some((d) => d.truncated) ? ' Very long files were shortened.' : '';
    const okText =
      done.length === 1
        ? `Read “${done[0].title}”. Check it, then save.${trunc}`
        : done.length > 1
          ? `Added ${done.length} notes to ${courseOf(newCourseId)?.code ?? 'your grove'}.${trunc}`
          : '';
    setUploadMsg({ ok: done.length > 0 && problems.length === 0, text: [okText, ...problems].filter(Boolean).join(' ') });
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    const created = makeNote(newTitle, newContent);
    const updated = [created, ...notes];
    setNotes(updated);
    storage.saveNotes(updated);
    setNewTitle('');
    setNewContent('');
    setUploadMsg(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const detail = selectedNoteForDetail;

  const LIMIT = 8;
  const sorted = [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const collapsed = !showAll && !q && sorted.length > LIMIT;
  const visible = collapsed ? sorted.slice(0, LIMIT) : sorted;
  const byYear = [4, 3, 2, 1]
    .map((y) => ({ year: y, items: visible.filter((n) => n.year === y).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="grid items-start gap-5 md:grid-cols-[5fr_6fr]">
      <form onSubmit={handleCreate} className={`${panel} space-y-4`}>
        <h3 className="text-[17px] text-text">Add to your grove</h3>
        {courses.length > 0 ? (
          <div>
            <label htmlFor="n-course" className={labelCls}>Course</label>
            <select id="n-course" value={newCourseId} onChange={(e) => setNewCourseId(e.target.value)} className={field}>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  Year {c.year} · {c.code}: {c.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label htmlFor="n-year" className={labelCls}>Year</label>
            <select id="n-year" value={newYear} onChange={(e) => setNewYear(Number(e.target.value) as AcademicYear)} className={field}>
              {[1, 2, 3, 4].map((y) => (
                <option key={y} value={y}>Year {y}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <span className={labelCls}>Upload notes</span>
          <input
            ref={fileRef}
            id="n-file"
            type="file"
            multiple
            accept={ACCEPT}
            className="sr-only"
            onChange={(e) => e.target.files && void handleFiles(e.target.files)}
          />
          <label
            htmlFor="n-file"
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); void handleFiles(e.dataTransfer.files); }}
            className={`flex cursor-pointer items-center gap-3 rounded-md border border-dashed px-3 py-3 text-sm focus-within:border-accent ${
              dragging ? 'border-accent bg-raised text-text' : 'border-line text-muted hover:bg-raised hover:text-text'
            }`}
          >
            <FileUp aria-hidden className="h-5 w-5 shrink-0 text-accent" />
            <span className="min-w-0">
              {reading ? 'Reading…' : 'Choose files or drop them here'}
              <span className="block text-xs text-muted">PDF, Word, text, Markdown or CSV. Read on your device, up to 8 MB each.</span>
            </span>
          </label>
          {uploadMsg && (
            <p role="status" className={`mt-2 text-xs ${uploadMsg.ok ? 'text-accent' : 'text-warn'}`}>{uploadMsg.text}</p>
          )}
        </div>
        <div>
          <label htmlFor="n-title" className={labelCls}>Title</label>
          <input id="n-title" type="text" required value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="What is this note about?" className={field} />
        </div>
        <div>
          <label htmlFor="n-content" className={labelCls}>Note</label>
          <textarea
            id="n-content"
            required
            rows={5}
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Paste or write what you learned, in your own words."
            className={`${field} min-h-[84px] resize-y`}
          />
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" className={primaryBtn}>Save note</button>
          {saved && <span role="status" className="text-sm text-accent">Saved.</span>}
        </div>
      </form>

      <section className={panel} aria-label="Your notes">
        <h3 className="mb-3 text-[17px] text-text">Your notes</h3>
        <label htmlFor="n-search" className={labelCls}>Search</label>
        <input
          id="n-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="pointers, Raft, joins…"
          className={field}
        />

        <div className="mt-2">
          {byYear.map((g) => (
            <div key={g.year}>
              <p className="mb-0.5 mt-4 font-mono text-xs uppercase tracking-[0.08em] text-accent">Year {g.year}</p>
              <ul className="divide-y divide-line">
                {g.items.map((note) => {
                  const course = courseOf(note.courseId);
                  return (
                    <li key={note.id} className="py-3">
                      <button onClick={() => setSelectedNoteForDetail(note)} className="block w-full text-left">
                        <span className="block font-semibold text-text">{note.title}</span>
                        <span className="block font-mono text-xs text-muted">
                          {course ? course.name : 'Course'} · {new Date(note.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span className="mt-1 line-clamp-2 block text-muted">
                          {note.summary || note.content.slice(0, 150)}
                        </span>
                      </button>
                      {note.tags.length > 0 && (
                        <p className="mt-1 font-mono text-[11px] text-warn">{note.tags.slice(0, 4).map((t) => `#${t.toLowerCase()}`).join(' ')}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {(collapsed || (showAll && !q && sorted.length > LIMIT)) && (
            <button onClick={() => setShowAll((v) => !v)} className="mt-3 min-h-10 text-sm text-accent hover:underline">
              {collapsed ? `Show all ${sorted.length} notes` : 'Show fewer'}
            </button>
          )}
          {filtered.length === 0 && (
            <p className="py-4 text-muted">
              {notes.length === 0 ? 'No notes yet. Add your first one.' : 'No notes match that search.'}
            </p>
          )}
        </div>
      </section>

      {detail && (
        <Modal title={detail.title} onClose={() => setSelectedNoteForDetail(null)} wide>
          <p className="text-sm text-muted">
            Year {detail.year} · {courseOf(detail.courseId)?.name || 'Course'} ·{' '}
            {new Date(detail.createdAt).toLocaleDateString()}
            {detail.masteryScore ? ` · ${detail.masteryScore}% mastery` : ''}
          </p>

          <div className="mt-5 space-y-4 text-[15px] leading-7 text-text">
            {(() => {
              // Dual coding: each picture sits right after the slide that explains the same idea (at most four per note).
              const paras = detail.content.split('\n\n');
              const spots = placePictures(paras);
              return paras.map((para, idx) => (
                <React.Fragment key={idx}>
                  {renderPara(para, idx)}
                  {(spots.get(idx) ?? []).map((id: TopicId) => (
                    <Suspense key={id} fallback={null}>
                      <div className="max-w-xl">
                        <VisualCard topicId={id} onOpen={onOpenVisual ? (t) => { setSelectedNoteForDetail(null); onOpenVisual(t); } : undefined} />
                      </div>
                    </Suspense>
                  ))}
                </React.Fragment>
              ));
            })()}
          </div>
          {detail.keyTakeaways && detail.keyTakeaways.length > 0 && (
            <div className="mt-6 rounded-xl bg-bg p-4">
              <h3 className="text-sm font-medium text-muted">Key takeaways</h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-text">
                {detail.keyTakeaways.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}

          {detail.tags.length > 0 && (
            <p className="mt-5 text-sm text-muted">{detail.tags.map((t) => `#${t}`).join('  ')}</p>
          )}
        </Modal>
      )}
    </div>
  );
};
