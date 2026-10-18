import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  BookOpen, 
  Calendar, 
  Tag, 
  Layers, 
  X, 
  CheckCircle2, 
  ArrowRight,
  Filter
} from 'lucide-react';
import { Note, Course, AcademicYear } from '../types';
import { storage } from '../services/storage';

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
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Note Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCourseId, setNewCourseId] = useState(courses[0]?.id || '');
  const [newYear, setNewYear] = useState<AcademicYear>(4);
  const [newContent, setNewContent] = useState('');
  const [newSummary, setNewSummary] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newTakeaways, setNewTakeaways] = useState('');

  // Filtering
  const filteredNotes = notes.filter((note) => {
    if (selectedYear !== 'all' && note.year !== selectedYear) return false;
    if (selectedCourseId !== 'all' && note.courseId !== selectedCourseId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = note.title.toLowerCase().includes(q);
      const matchContent = note.content.toLowerCase().includes(q);
      const matchTags = note.tags.some(t => t.toLowerCase().includes(q));
      if (!matchTitle && !matchContent && !matchTags) return false;
    }
    return true;
  });

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const course = courses.find(c => c.id === newCourseId);

    const created: Note = {
      id: `note-${Date.now()}`,
      courseId: newCourseId,
      year: course ? course.year : newYear,
      title: newTitle.trim(),
      content: newContent.trim(),
      summary: newSummary.trim() || newTitle.trim(),
      tags: newTags.split(',').map(t => t.trim()).filter(Boolean),
      keyTakeaways: newTakeaways.split('\n').map(t => t.trim()).filter(Boolean),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      masteryScore: 85,
    };

    const updated = [created, ...notes];
    setNotes(updated);
    storage.saveNotes(updated);

    // Reset Form
    setNewTitle('');
    setNewContent('');
    setNewSummary('');
    setNewTags('');
    setNewTakeaways('');
    setIsAddModalOpen(false);
  };

  const getYearBadgeColor = (year: AcademicYear) => {
    switch (year) {
      case 1: return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 2: return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 3: return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 4: return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
      
      {/* Top Banner & Control Deck */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-emerald-400" />
            Degree Knowledge Base
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Browse and query course notes across your entire 4-year degree curriculum.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-sm font-semibold shadow-lg shadow-emerald-900/30 transition-colors self-start md:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add Course Note</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-4">
        {/* Year Filter Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1 shrink-0">
            <Filter className="h-3.5 w-3.5 text-slate-500" /> Year:
          </span>
          <button
            onClick={() => setSelectedYear('all')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors shrink-0 ${
              selectedYear === 'all'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
            }`}
          >
            All 4 Years ({notes.length})
          </button>

          {[1, 2, 3, 4].map((year) => {
            const count = notes.filter(n => n.year === year).length;
            const labels = ['Year 1: Foundations', 'Year 2: Core Systems', 'Year 3: Distributed', 'Year 4: Capstone'];
            return (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors shrink-0 ${
                  selectedYear === year
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                {labels[year - 1]} ({count})
              </button>
            );
          })}
        </div>

        {/* Search & Course Selector Row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search across 4-year notes by concept, algorithm, or tag..."
              className="w-full rounded-xl bg-slate-900/90 border border-slate-800 pl-9 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60"
            />
          </div>

          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="rounded-xl bg-slate-900/90 border border-slate-800 px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500/60"
          >
            <option value="all">All Courses</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>
                Year {c.year} · {c.code}: {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredNotes.map((note) => {
          const course = courses.find(c => c.id === note.courseId);
          return (
            <div
              key={note.id}
              onClick={() => setSelectedNoteForDetail(note)}
              className="group cursor-pointer rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800/80 hover:border-emerald-500/40 p-5 flex flex-col justify-between transition-[background-color,border-color,transform] duration-200 ease-out hover-lift shadow-lg shadow-black/20"
            >
              <div>
                {/* Header Badge */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold border ${getYearBadgeColor(note.year)}`}>
                      Year {note.year}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      {course ? course.code : 'COURSE'}
                    </span>
                  </div>

                  {note.masteryScore && (
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-medium">
                      {note.masteryScore}% mastery
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-base font-semibold text-slate-100 group-hover:text-emerald-300 transition-colors line-clamp-2">
                  {note.title}
                </h3>

                {/* Summary */}
                <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                  {note.summary || note.content.slice(0, 150)}
                </p>

                {/* Key Takeaways preview */}
                {note.keyTakeaways && note.keyTakeaways.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-800/60 space-y-1">
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Key Takeaway</div>
                    <div className="flex items-start gap-1.5 text-xs text-slate-300 line-clamp-2">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{note.keyTakeaways[0]}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Tags */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <div className="flex flex-wrap gap-1 max-w-[80%]">
                  {note.tags.slice(0, 3).map((tag, i) => (
                    <span
                      key={i}
                      className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-emerald-400 transition-colors" />
              </div>
            </div>
          );
        })}

        {filteredNotes.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-500">
            <BookOpen className="h-10 w-10 mx-auto text-slate-600 mb-3 opacity-50" />
            <p className="text-sm">No notes found matching your criteria.</p>
            <p className="text-xs text-slate-600 mt-1">Try resetting the filters or add a new course note.</p>
          </div>
        )}
      </div>

      {/* Note Detail Modal */}
      {selectedNoteForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-3xl max-h-[85dvh] overflow-y-auto rounded-2xl bg-[#0f121a] border border-white/[0.08] p-6 shadow-2xl shadow-black/80 text-slate-200 animate-enter">
            
            <button
              onClick={() => setSelectedNoteForDetail(null)}
              className="absolute top-4 right-4 h-8 w-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Note Meta */}
            <div className="flex items-center gap-2 mb-2">
              <span className={`rounded-md px-2 py-0.5 text-xs font-bold border ${getYearBadgeColor(selectedNoteForDetail.year)}`}>
                Year {selectedNoteForDetail.year}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                {courses.find(c => c.id === selectedNoteForDetail.courseId)?.name || 'Course'}
              </span>
              <span className="text-xs text-slate-500 ml-auto mr-8">
                {new Date(selectedNoteForDetail.createdAt).toLocaleDateString()}
              </span>
            </div>

            <h2 className="text-2xl font-bold text-white mb-4">
              {selectedNoteForDetail.title}
            </h2>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mb-6">
              {selectedNoteForDetail.tags.map((t, i) => (
                <span key={i} className="flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-xs text-emerald-400 border border-slate-700/60">
                  <Tag className="h-3 w-3" />
                  {t}
                </span>
              ))}
            </div>

            {/* Content Body */}
            <div className="space-y-4 text-sm leading-relaxed border-t border-slate-800 pt-4">
              {selectedNoteForDetail.content.split('\n\n').map((para, idx) => {
                if (para.startsWith('# ')) {
                  return <h1 key={idx} className="text-xl font-bold text-emerald-400 mt-4">{para.replace('# ', '')}</h1>;
                }
                if (para.startsWith('### ')) {
                  return <h3 key={idx} className="text-base font-bold text-slate-100 mt-3">{para.replace('### ', '')}</h3>;
                }
                if (para.startsWith('```')) {
                  const lines = para.split('\n');
                  const code = lines.slice(1, -1).join('\n');
                  return (
                    <pre key={idx} className="rounded-xl bg-slate-950 p-4 border border-slate-800 font-mono text-xs overflow-x-auto text-emerald-300">
                      <code>{code}</code>
                    </pre>
                  );
                }
                return <p key={idx} className="text-slate-300">{para}</p>;
              })}
            </div>

            {/* Key Takeaways */}
            {selectedNoteForDetail.keyTakeaways && selectedNoteForDetail.keyTakeaways.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-800 bg-slate-950/60 rounded-xl p-4">
                <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">
                  Key Takeaways
                </h4>
                <ul className="space-y-1.5">
                  {selectedNoteForDetail.keyTakeaways.map((takeaway, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{takeaway}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedNoteForDetail(null)}
                className="rounded-xl bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 text-xs font-semibold"
              >
                Close Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Note Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-2xl max-h-[90dvh] overflow-y-auto rounded-2xl bg-[#0f121a] border border-white/[0.08] p-6 shadow-2xl shadow-black/80 text-slate-200 animate-enter">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 h-8 w-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>

            <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <Plus className="h-5 w-5 text-emerald-400" />
              Add Course Note to Degree Memory
            </h2>
            <p className="text-xs text-slate-400 mb-5">
              Every note you add is permanently indexed into Grove's 4-year retrieval and portfolio engine.
            </p>

            <form onSubmit={handleCreateNote} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Course
                  </label>
                  <select
                    value={newCourseId}
                    onChange={(e) => {
                      setNewCourseId(e.target.value);
                      const c = courses.find(c => c.id === e.target.value);
                      if (c) setNewYear(c.year);
                    }}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>
                        Year {c.year} · {c.code}: {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Academic Year
                  </label>
                  <select
                    value={newYear}
                    onChange={(e) => setNewYear(Number(e.target.value) as AcademicYear)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value={1}>Year 1: Foundations</option>
                    <option value={2}>Year 2: Core Systems</option>
                    <option value={3}>Year 3: Distributed Systems</option>
                    <option value={4}>Year 4: Capstone & Advanced</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Note Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Distributed Consensus & Paxos Guarantees"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  1-Sentence Summary
                </label>
                <input
                  type="text"
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  placeholder="Brief synopsis for quick retrieval"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="e.g. Raft, Consensus, Distributed Systems"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Detailed Notes (Markdown supported)
                </label>
                <textarea
                  required
                  rows={6}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Paste or write lecture notes, code snippets, and conceptual breakdowns..."
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Key Takeaways (one per line)
                </label>
                <textarea
                  rows={2}
                  value={newTakeaways}
                  onChange={(e) => setNewTakeaways(e.target.value)}
                  placeholder="Quorum majority requires > N/2 votes to commit."
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 text-xs font-semibold shadow-lg shadow-emerald-900/30"
                >
                  Save to Degree Memory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
