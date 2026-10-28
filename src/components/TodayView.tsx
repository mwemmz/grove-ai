/* The first screen: one tap to study. Everything else is a menu item away. */
import { isPastPaper } from '../lib/noteOrder';
import { ArrowRight, ArrowUpRight, BookOpen, Layers, NotebookText, ScrollText, Timer } from 'lucide-react';
import type { Course, Flashcard, Note } from '../types';
import type { AppTab } from './Header';

interface Props {
  notes: Note[];
  courses: Course[];
  flashcards: Flashcard[];
  lastNoteId: string | null;
  onOpenNote: (id: string) => void;
  onGo: (tab: AppTab) => void;
  name?: string;
}

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

/** A tile: icon chip top-left, a small arrow top-right that turns toward the corner on hover. */
function Tile({ icon: Icon, title, detail, onClick, tall = false, className = '' }: { icon: typeof Timer; title: string; detail: string; onClick: () => void; tall?: boolean; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={`hover-lift group glass flex flex-col justify-between gap-6 rounded-[24px] p-4 text-left ring-1 ring-line/80 hover:bg-raised/60 ${
        tall ? 'min-h-[132px] sm:row-span-2 sm:min-h-full' : 'min-h-[132px]'
      } ${className}`}
    >
      <span className="flex w-full items-start justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-raised text-accent ring-1 ring-line">
          <Icon aria-hidden className="h-5 w-5" />
        </span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full text-muted ring-1 ring-line transition-[transform,background-color,color] duration-200 group-hover:-rotate-45 group-hover:bg-accent group-hover:text-ink">
          <ArrowUpRight aria-hidden className="h-4 w-4 rotate-45" />
        </span>
      </span>
      <span>
        <span className={`block font-display text-text ${tall ? 'text-xl sm:text-2xl' : 'text-lg'}`}>{title}</span>
        <span className="mt-0.5 block text-sm text-muted">{detail}</span>
      </span>
    </button>
  );
}

export function TodayView({ notes: allNotes, courses, flashcards, lastNoteId, onOpenNote, onGo, name }: Props) {
  // Past papers have their own tab; "your notes" and "pick up where you left off" are about the notes.
  const notes = allNotes.filter((n) => !isPastPaper(n));
  const latest = [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const resume = allNotes.find((n) => n.id === lastNoteId) ?? latest;
  const courseName = (n: Note) => courses.find((c) => c.id === n.courseId)?.name;
  const due = flashcards.filter((f) => f.dueDate <= new Date().toISOString()).length;
  const first = name?.trim().split(/\s+/)[0];

  return (
    <div className="stagger space-y-4">
      <div className="pt-2">
        <p className="text-sm text-muted">{greeting()}{first ? `, ${first}` : ''}</p>
        <h1 className="mt-1 font-display text-3xl tracking-tight text-text sm:text-4xl">What do you want to do?</h1>
      </div>

      {/* The one loud card on the screen: the accent colour, full bleed, the next step in one tap. */}
      {resume ? (
        <button
          onClick={() => onOpenNote(resume.id)}
          className="hover-lift nudge group relative flex w-full items-end justify-between gap-4 overflow-hidden rounded-[28px] bg-accent p-5 text-left text-ink shadow-[0_24px_60px_-30px_var(--color-glow)] sm:p-6"
          aria-label={`Continue reading ${resume.title}`}
        >
          <span aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-ink/10" />
          <span aria-hidden className="pointer-events-none absolute -right-4 top-10 h-28 w-28 rounded-full bg-ink/10" />
          <span className="relative min-w-0 flex-1">
            <span className="block text-sm font-medium opacity-70">Pick up where you left off</span>
            <span className="mt-6 block font-display text-2xl leading-tight sm:text-3xl">{resume.title}</span>
            {courseName(resume) && <span className="mt-1 block truncate text-sm opacity-70">{courseName(resume)}</span>}
          </span>
          <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink text-accent">
            <ArrowRight aria-hidden className="h-5 w-5" />
          </span>
        </button>
      ) : (
        <button
          onClick={() => onGo('notes')}
          className="hover-lift nudge relative flex w-full items-end justify-between gap-4 overflow-hidden rounded-[28px] bg-accent p-5 text-left text-ink sm:p-6"
        >
          <span className="min-w-0 flex-1">
            <span className="block font-display text-2xl">Add your first notes</span>
            <span className="mt-1 block text-sm opacity-75">Upload slides or a PDF and Grove turns them into notes you can study.</span>
          </span>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink text-accent">
            <ArrowRight aria-hidden className="h-5 w-5" />
          </span>
        </button>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:grid-rows-2">
        <Tile tall icon={Timer} title="Start a study session" detail="Pick a method and a timer" onClick={() => onGo('study')} />
        <Tile icon={Layers} title="Quiz me" detail={due > 0 ? `${due} ${due === 1 ? 'card' : 'cards'} due now` : 'Flashcards from your notes'} onClick={() => onGo('quiz')} />
        <Tile icon={BookOpen} title="Ask a question" detail="Answers from your notes" onClick={() => onGo('remember')} />
        <Tile icon={NotebookText} title="Your notes" detail={notes.length === 0 ? 'Nothing here yet' : `${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`} onClick={() => onGo('notes')} />
        <Tile className="col-span-2 sm:col-span-1" icon={ScrollText} title="Past papers" detail="Practise with real exams" onClick={() => onGo('papers')} />
      </div>
    </div>
  );
}
