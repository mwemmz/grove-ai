import React, { useState } from 'react';
import { Note, Course, AcademicYear } from '../types';
import { storage } from '../services/storage';
import { Modal, Inline, field, labelCls, primaryBtn, panel } from './ui';

interface DegreeMemoryViewProps {
  notes: Note[];
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  courses: Course[];
  selectedNoteForDetail: Note | null;
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
  notes,
  setNotes,
  courses,
  selectedNoteForDetail,
  setSelectedNoteForDetail,
}) => {
  const [query, setQuery] = useState('');
  const [saved, setSaved] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newCourseId, setNewCourseId] = useState(courses[0]?.id || '');
  const [newYear, setNewYear] = useState<AcademicYear>(4);
  const [newContent, setNewContent] = useState('');

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

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    const course = courseOf(newCourseId);
    const created: Note = {
      id: `note-${Date.now()}`,
      courseId: newCourseId,
      year: course ? course.year : newYear,
      title: newTitle.trim(),
      content: newContent.trim(),
      summary: newContent.trim().slice(0, 140),
      tags: autoTags(`${newTitle} ${newContent}`),
      keyTakeaways: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      masteryScore: 85,
    };
    const updated = [created, ...notes];
    setNotes(updated);
    storage.saveNotes(updated);
    setNewTitle('');
    setNewContent('');
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
            {detail.content.split('\n\n').map((para, idx) => {
              if (para.startsWith('# ')) {
                return <h3 key={idx} className="pt-2 text-lg font-semibold">{para.replace('# ', '')}</h3>;
              }
              if (para.startsWith('### ')) {
                return <h4 key={idx} className="pt-1 text-base font-semibold">{para.replace('### ', '')}</h4>;
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
            })}
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
