import React, { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Note, Course, AcademicYear } from '../types';
import { storage } from '../services/storage';
import { PageHeader, Segmented, Disclosure, Modal, Inline, field, labelCls, primaryBtn, quietBtn } from './ui';

interface DegreeMemoryViewProps {
  notes: Note[];
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  courses: Course[];
  selectedNoteForDetail: Note | null;
  setSelectedNoteForDetail: (note: Note | null) => void;
}

export const DegreeMemoryView: React.FC<DegreeMemoryViewProps> = ({
  notes,
  setNotes,
  courses,
  selectedNoteForDetail,
  setSelectedNoteForDetail,
}) => {
  const [year, setYear] = useState<'all' | '1' | '2' | '3' | '4'>('all');
  const [courseId, setCourseId] = useState('all');
  const [query, setQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newCourseId, setNewCourseId] = useState(courses[0]?.id || '');
  const [newYear, setNewYear] = useState<AcademicYear>(4);
  const [newContent, setNewContent] = useState('');
  const [newSummary, setNewSummary] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newTakeaways, setNewTakeaways] = useState('');

  const q = query.trim().toLowerCase();
  const filtered = notes.filter((n) => {
    if (year !== 'all' && n.year !== Number(year)) return false;
    if (courseId !== 'all' && n.courseId !== courseId) return false;
    if (!q) return true;
    return (
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const courseOf = (id: string) => courses.find((c) => c.id === id);
  const yearsCovered = new Set(notes.map((n) => n.year)).size;

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
      summary: newSummary.trim() || newTitle.trim(),
      tags: newTags.split(',').map((t) => t.trim()).filter(Boolean),
      keyTakeaways: newTakeaways.split('\n').map((t) => t.trim()).filter(Boolean),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      masteryScore: 85,
    };
    const updated = [created, ...notes];
    setNotes(updated);
    storage.saveNotes(updated);
    setNewTitle('');
    setNewContent('');
    setNewSummary('');
    setNewTags('');
    setNewTakeaways('');
    setIsAddOpen(false);
  };

  const detail = selectedNoteForDetail;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6">
      <PageHeader
        title="Notes"
        subtitle={`${notes.length} ${notes.length === 1 ? 'note' : 'notes'} across ${yearsCovered} ${yearsCovered === 1 ? 'year' : 'years'}. Grove answers from these.`}
        action={
          <button onClick={() => setIsAddOpen(true)} className={primaryBtn}>
            <Plus className="h-4 w-4" />
            New note
          </button>
        }
      />

      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes"
            aria-label="Search notes"
            className={`${field} h-11 bg-surface pl-10`}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            label="Filter by year"
            value={year}
            onChange={setYear}
            options={[
              { id: 'all', label: 'All' },
              { id: '1', label: 'Year 1' },
              { id: '2', label: 'Year 2' },
              { id: '3', label: 'Year 3' },
              { id: '4', label: 'Year 4' },
            ]}
          />
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            aria-label="Filter by course"
            className="h-11 rounded-xl bg-surface px-3 text-sm text-muted ring-1 ring-transparent focus:outline-none focus:ring-accent/70"
          >
            <option value="all">All courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} · {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ul className="divide-y divide-line">
        {filtered.map((note) => {
          const course = courseOf(note.courseId);
          return (
            <li key={note.id}>
              <button
                onClick={() => setSelectedNoteForDetail(note)}
                className="-mx-3 block w-[calc(100%+1.5rem)] rounded-xl px-3 py-4 text-left transition-colors hover:bg-surface"
              >
                <p className="text-sm text-muted">
                  Year {note.year}
                  {course ? ` · ${course.code}` : ''}
                </p>
                <h2 className="mt-0.5 text-base font-medium text-text">{note.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">
                  {note.summary || note.content.slice(0, 150)}
                </p>
              </button>
            </li>
          );
        })}
      </ul>

      {filtered.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-text">{notes.length === 0 ? 'No notes yet.' : 'Nothing matches that.'}</p>
          <p className="mt-1 text-sm text-muted">
            {notes.length === 0 ? 'Add your first note and Grove can start answering from it.' : 'Try another word or clear the filters.'}
          </p>
        </div>
      )}

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

      {isAddOpen && (
        <Modal title="New note" onClose={() => setIsAddOpen(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            {courses.length > 0 ? (
              <div>
                <label htmlFor="n-course" className={labelCls}>Course</label>
                <select
                  id="n-course"
                  value={newCourseId}
                  onChange={(e) => setNewCourseId(e.target.value)}
                  className={field}
                >
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
                <select
                  id="n-year"
                  value={newYear}
                  onChange={(e) => setNewYear(Number(e.target.value) as AcademicYear)}
                  className={field}
                >
                  {[1, 2, 3, 4].map((y) => (
                    <option key={y} value={y}>Year {y}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="n-title" className={labelCls}>Title</label>
              <input
                id="n-title"
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Paxos guarantees"
                className={field}
              />
            </div>

            <div>
              <label htmlFor="n-content" className={labelCls}>Note</label>
              <textarea
                id="n-content"
                required
                rows={7}
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Write or paste what you learned, in your own words."
                className={field}
              />
            </div>

            <Disclosure summary="Add a summary, tags or takeaways">
              <div className="space-y-4">
                <div>
                  <label htmlFor="n-summary" className={labelCls}>One-line summary</label>
                  <input id="n-summary" type="text" value={newSummary} onChange={(e) => setNewSummary(e.target.value)} className={field} />
                </div>
                <div>
                  <label htmlFor="n-tags" className={labelCls}>Tags, separated by commas</label>
                  <input id="n-tags" type="text" value={newTags} onChange={(e) => setNewTags(e.target.value)} placeholder="Raft, consensus" className={field} />
                </div>
                <div>
                  <label htmlFor="n-take" className={labelCls}>Key takeaways, one per line</label>
                  <textarea id="n-take" rows={3} value={newTakeaways} onChange={(e) => setNewTakeaways(e.target.value)} className={field} />
                </div>
              </div>
            </Disclosure>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsAddOpen(false)} className={quietBtn}>Cancel</button>
              <button type="submit" className={primaryBtn}>Save note</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
