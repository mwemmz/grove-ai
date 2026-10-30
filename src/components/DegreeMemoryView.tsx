import { isPastPaper, compareNotes } from '../lib/noteOrder';
import React, { useRef, useState } from 'react';
import { ArrowRight, ChevronRight, FileUp } from 'lucide-react';
import { CourseCover } from './CourseCover';
import { EmptyState } from './EmptyState';
import { Note, Course, AcademicYear } from '../types';
import { storage } from '../services/storage';
import { ACCEPT, extractText } from '../services/fileText';
import { storePackFigures } from '../services/figures';
import { field, labelCls, primaryBtn, panel } from './ui';
import { NoteReader } from './NoteReader';
import type { TopicId } from '../data/visualTopics';
import { mergePack, parseNotesPack } from '../services/notesPack';
import { COURSE_AUDIENCE, canSee, getStudentId } from '../services/access';

interface DegreeMemoryViewProps {
  /** 'papers' lists only past papers; 'notes' lists everything else. */
  mode?: 'notes' | 'papers';
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

export const DegreeMemoryView: React.FC<DegreeMemoryViewProps> = ({
  mode = 'notes',
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
  const [adding, setAdding] = useState(false);
  const [openCourse, setOpenCourse] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newCourseId, setNewCourseId] = useState(courses[0]?.id || '');
  const [newYear, setNewYear] = useState<AcademicYear>(4);
  const [newContent, setNewContent] = useState('');

  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [reading, setReading] = useState(false);
  const [readingMsg, setReadingMsg] = useState<string | null>(null);
  const [uploadMsg, setUploadMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const q = query.trim().toLowerCase();
  const papers = mode === 'papers';
  const filtered = notes.filter((n) => {
    if (isPastPaper(n) !== papers) return false;
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
      const rawText = await f.text().catch(() => '');
      const pack = parseNotesPack(rawText);
      if (!pack) continue;
      try {
        await storePackFigures(pack.course.code, (JSON.parse(rawText) as { figures?: Record<string, string> }).figures);
      } catch {
        /* pictures are a bonus */
      }
      files.splice(files.indexOf(f), 1);
      const need = pack.audience ?? COURSE_AUDIENCE[pack.course.code.toUpperCase()];
      if (!canSee(need)) {
        setReading(false);
    setReadingMsg(null);
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
      const refreshed = merged.updated;
      const updated = merged.notes;
      setNotes(updated);
      storage.saveNotes(updated);
      setReading(false);
    setReadingMsg(null);
      setUploadMsg({
        ok: true,
        text:
          fresh.length === 0
            ? refreshed > 0
              ? `Updated ${refreshed} ${pack.course.code} notes to the latest version.`
              : `All ${pack.notes.length} ${pack.course.code} notes are already here.`
            : `Added ${fresh.length} ${pack.course.code} notes${pack.notes.length > fresh.length ? ` (${pack.notes.length - fresh.length} were already here)` : ''}. Open one to see the pictures beside the slides.`,
      });
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    for (const f of files) {
      try {
        done.push(await extractText(f, setReadingMsg));
      } catch (err) {
        problems.push(err instanceof Error ? err.message : `${f.name}: could not be read.`);
      }
    }
    setReading(false);
    setReadingMsg(null);
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
    setAdding(false);
    setTimeout(() => setSaved(false), 2500);
  };

  const detail = selectedNoteForDetail;
  // The course's notes in teaching order, so the reader can offer the next one.
  const siblings = detail ? notes.filter((n) => n.courseId === detail.courseId && isPastPaper(n) === isPastPaper(detail)).sort(compareNotes) : [];
  const at = detail ? siblings.findIndex((n) => n.id === detail.id) : -1;

  const sorted = [...filtered].sort(compareNotes);
  const groups = Array.from(new Set(sorted.map((n) => n.courseId))).map((id) => ({
    id,
    course: courseOf(id),
    items: sorted.filter((n) => n.courseId === id),
  }));
  // One course open at a time keeps the page short; a search opens everything that matches.
  const isOpen = (id: string, i: number) => !!q || (openCourse === null ? i === 0 : openCourse === id);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <input
          id="n-search"
          type="search"
          aria-label="Search your notes"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={papers ? 'Search past papers: 2023, ETL, OLAP…' : 'Search notes: ETL, circular flow, joins…'}
          className={`${field} flex-1`}
        />
        {!papers && <button type="button" onClick={() => setAdding((v) => !v)} className={primaryBtn} aria-expanded={adding}>
          {adding ? 'Close' : 'Add notes'}
        </button>}
      </div>
      {!adding && uploadMsg && <p role="status" className={`text-sm ${uploadMsg.ok ? 'text-accent' : 'text-warn'}`}>{uploadMsg.text}</p>}
      {!adding && saved && <p role="status" className="text-sm text-accent">Saved.</p>}

      {adding && (
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
              {reading ? readingMsg ?? 'Reading…' : 'Choose files or drop them here'}
              <span className="block text-xs text-muted">PDF (scans too), Word, PowerPoint, photos of pages, text or CSV. Read on your device, up to 8 MB each.</span>
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
      )}

      <section aria-label="Your notes" className="space-y-2">
        {groups.map((g, i) => {
          const open = isOpen(g.id, i);
          return (
            <div key={g.id} className={`${panel} p-2!`}>
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenCourse(open && !q ? '' : g.id)}
                className="flex w-full items-center justify-between gap-3 rounded-[18px] px-3 py-3 text-left hover:bg-raised/50"
              >
                {g.course && <span className="hidden shrink-0 sm:block"><CourseCover code={g.course.code} className="h-14 w-20 rounded-2xl ring-1 ring-line" /></span>}
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-lg leading-snug text-text">{g.course ? g.course.name : 'Other notes'}</span>
                  {g.course && <span className="mt-1 inline-flex items-center gap-2 font-mono text-xs text-muted"><span className="rounded-full bg-raised px-2 py-0.5 text-text">{g.course.code}</span>Year {g.course.year}</span>}
                </span>
                <span className="flex shrink-0 items-center gap-2 text-sm text-muted">
                  {g.items.length} {papers ? (g.items.length === 1 ? 'paper' : 'papers') : g.items.length === 1 ? 'note' : 'notes'}
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full ring-1 ring-line transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${open ? 'rotate-90 bg-accent text-ink ring-accent' : ''}`}>
                    <ChevronRight aria-hidden className="h-4 w-4" />
                  </span>
                </span>
              </button>
              {open && (
                <ul className="stagger mt-1 space-y-0.5 pb-1">
                  {g.items.map((note) => {
                    const m = /^(?:unit|week|chapter|lecture|topic)\s*([\d.]+)\s*[·:\-]\s*(.+)$/i.exec(note.title);
                    return (
                      <li key={note.id}>
                        <button
                          onClick={() => setSelectedNoteForDetail(note)}
                          className="nudge group flex min-h-12 w-full items-center gap-3 rounded-[16px] px-3 py-2 text-left hover:bg-raised/70"
                        >
                          {m && (
                            <span className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full bg-raised px-2 font-mono text-xs text-text ring-1 ring-line group-hover:bg-accent group-hover:text-ink group-hover:ring-accent">
                              {m[1]}
                            </span>
                          )}
                          <span className="min-w-0 flex-1 text-text">{m ? m[2] : note.title}</span>
                          <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-muted opacity-0 group-hover:opacity-100" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
        {filtered.length === 0 &&
          (q ? (
            <p className="py-4 text-muted">{papers ? 'No past papers match that search.' : 'No notes match that search.'}</p>
          ) : (
            <EmptyState
              title={papers ? 'No past papers yet' : 'No notes yet'}
              text={papers ? 'Your university adds past papers to your course. They will appear here.' : 'Upload your slides or a PDF and Grove turns them into notes you can study.'}
              action={papers ? undefined : { label: 'Add notes', onClick: () => setAdding(true) }}
            />
          ))}
      </section>

      {detail && (
        <NoteReader
          note={detail}
          courseName={courseOf(detail.courseId)?.name}
          onClose={() => setSelectedNoteForDetail(null)}
          onOpenVisual={onOpenVisual}
          prev={at > 0 ? siblings[at - 1] : undefined}
          next={at >= 0 && at < siblings.length - 1 ? siblings[at + 1] : undefined}
          onGo={(n) => {
            setSelectedNoteForDetail(n);
            try { localStorage.setItem('grove_last_note', n.id); } catch { /* private mode: fine */ }
          }}
        />
      )}
    </div>
  );
};
