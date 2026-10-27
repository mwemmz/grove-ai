/* The first screen: one tap to study. Everything else is a menu item away. */
import { ArrowRight, BookOpen, Layers, NotebookText, Timer } from 'lucide-react';
import type { Course, Flashcard, Note } from '../types';
import type { AppTab } from './Header';
import { panel, primaryBtn } from './ui';

interface Props {
  notes: Note[];
  courses: Course[];
  flashcards: Flashcard[];
  lastNoteId: string | null;
  onOpenNote: (id: string) => void;
  onGo: (tab: AppTab) => void;
}

const tile =
  'group flex min-h-[96px] flex-col justify-between rounded-[10px] bg-surface p-4 text-left ring-1 ring-line transition-colors hover:bg-raised focus-visible:ring-2 focus-visible:ring-accent';

export function TodayView({ notes, courses, flashcards, lastNoteId, onOpenNote, onGo }: Props) {
  const latest = [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const resume = notes.find((n) => n.id === lastNoteId) ?? latest;
  const courseName = (n: Note) => courses.find((c) => c.id === n.courseId)?.name;
  const due = flashcards.filter((f) => f.dueDate <= new Date().toISOString()).length;

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl tracking-tight text-text">What do you want to do?</h1>

      {resume ? (
        <section className={`${panel} flex flex-wrap items-center justify-between gap-4`} aria-label="Continue reading">
          <div className="min-w-0 flex-1 basis-60">
            <p className="font-mono text-xs uppercase tracking-[0.08em] text-accent">Pick up where you left off</p>
            <p className="mt-1 truncate text-lg font-semibold text-text">{resume.title}</p>
            {courseName(resume) && <p className="text-sm text-muted">{courseName(resume)}</p>}
          </div>
          <button onClick={() => onOpenNote(resume.id)} className={primaryBtn}>
            Open note <ArrowRight aria-hidden className="h-4 w-4" />
          </button>
        </section>
      ) : (
        <section className={`${panel} flex flex-wrap items-center justify-between gap-4`} aria-label="Get started">
          <div className="min-w-0 flex-1 basis-60">
            <p className="text-lg font-semibold text-text">Add your first notes</p>
            <p className="text-sm text-muted">Upload slides or a PDF and Grove turns them into notes you can study.</p>
          </div>
          <button onClick={() => onGo('notes')} className={primaryBtn}>Add notes</button>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => onGo('study')} className={tile}>
          <Timer aria-hidden className="h-5 w-5 text-accent" />
          <span>
            <span className="block font-semibold text-text">Start a study session</span>
            <span className="block text-sm text-muted">Pick a method and a timer</span>
          </span>
        </button>
        <button onClick={() => onGo('quiz')} className={tile}>
          <Layers aria-hidden className="h-5 w-5 text-accent" />
          <span>
            <span className="block font-semibold text-text">Quiz me</span>
            <span className="block text-sm text-muted">{due > 0 ? `${due} ${due === 1 ? 'card' : 'cards'} due now` : 'Flashcards from your notes'}</span>
          </span>
        </button>
        <button onClick={() => onGo('remember')} className={tile}>
          <BookOpen aria-hidden className="h-5 w-5 text-accent" />
          <span>
            <span className="block font-semibold text-text">Ask a question</span>
            <span className="block text-sm text-muted">Answers from your notes, with sources</span>
          </span>
        </button>
        <button onClick={() => onGo('notes')} className={tile}>
          <NotebookText aria-hidden className="h-5 w-5 text-accent" />
          <span>
            <span className="block font-semibold text-text">Your notes</span>
            <span className="block text-sm text-muted">{notes.length === 0 ? 'Nothing here yet' : `${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`}</span>
          </span>
        </button>
      </div>
    </div>
  );
}
