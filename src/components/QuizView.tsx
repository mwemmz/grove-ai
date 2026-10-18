import React, { useState } from 'react';
import { RotateCw, Award, Plus, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Flashcard, Note } from '../types';
import { storage } from '../services/storage';
import { PageHeader, Segmented, Inline, quietBtn } from './ui';

interface QuizViewProps {
  flashcards: Flashcard[];
  setFlashcards: React.Dispatch<React.SetStateAction<Flashcard[]>>;
  notes: Note[];
}

export const QuizView: React.FC<QuizViewProps> = ({
  flashcards,
  setFlashcards,
  notes,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Filter flashcards
  const activeDeck = flashcards.filter(c => selectedYear === 'all' || c.year === selectedYear);
  const currentCard = activeDeck[currentIndex] || activeDeck[0];

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleScore = (quality: 'again' | 'hard' | 'good' | 'easy') => {
    if (!currentCard) return;

    let newInterval = currentCard.interval;
    let newRepetition = currentCard.repetition;
    let newStatus = currentCard.status;

    if (quality === 'again') {
      newInterval = 1;
      newRepetition = 0;
      newStatus = 'learning';
    } else if (quality === 'hard') {
      newInterval = Math.max(2, Math.round(currentCard.interval * 1.2));
      newRepetition += 1;
    } else if (quality === 'good') {
      newInterval = Math.round(currentCard.interval * 1.5) + 3;
      newRepetition += 1;
      newStatus = 'learning';
    } else if (quality === 'easy') {
      newInterval = Math.round(currentCard.interval * 2.2) + 7;
      newRepetition += 1;
      newStatus = 'mastered';
    }

    const updatedCard: Flashcard = {
      ...currentCard,
      interval: newInterval,
      repetition: newRepetition,
      status: newStatus,
      lastReviewed: new Date().toISOString().split('T')[0],
    };

    const updatedAll = flashcards.map(c => c.id === currentCard.id ? updatedCard : c);
    setFlashcards(updatedAll);
    storage.saveFlashcards(updatedAll);

    // Advance to next card
    if (currentIndex + 1 < activeDeck.length) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    } else {
      setSessionCompleted(true);
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      }
    }
  };

  const resetSession = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionCompleted(false);
  };

  // Add Card State
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [newNoteId, setNewNoteId] = useState(notes[0]?.id || '');

  const handleCreateCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFront.trim() || !newBack.trim()) return;

    const sourceNote = notes.find(n => n.id === newNoteId);

    const card: Flashcard = {
      id: `fc-${Date.now()}`,
      noteId: newNoteId,
      courseCode: sourceNote ? sourceNote.courseId.replace('c-', '').toUpperCase() : 'CS',
      year: sourceNote ? sourceNote.year : 4,
      front: newFront.trim(),
      back: newBack.trim(),
      interval: 1,
      repetition: 0,
      easeFactor: 2.5,
      dueDate: new Date().toISOString().split('T')[0],
      status: 'new',
    };

    const updated = [card, ...flashcards];
    setFlashcards(updated);
    storage.saveFlashcards(updated);

    setNewFront('');
    setNewBack('');
    setIsCreateModalOpen(false);
  };

  return (
    <div className="w-full space-y-6">
      
      <PageHeader
        title="Recall"
        subtitle="Flashcards from your notes, timed to come back just before you would forget them."
        action={
          <button onClick={() => setIsCreateModalOpen(true)} className={quietBtn}>
            <Plus className="h-4 w-4" />
            Add flashcard
          </button>
        }
      />

      <Segmented
        label="Filter by year"
        value={String(selectedYear)}
        onChange={(v) => { setSelectedYear(v === 'all' ? 'all' : Number(v)); resetSession(); }}
        options={[
          { id: 'all', label: 'All' },
          { id: '1', label: 'Year 1' },
          { id: '2', label: 'Year 2' },
          { id: '3', label: 'Year 3' },
          { id: '4', label: 'Year 4' },
        ]}
      />

      {/* Card Arena */}
      {!sessionCompleted && currentCard ? (
        <div className="space-y-4">
          
          {/* Progress Tracker */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Card {currentIndex + 1} of {activeDeck.length}</span>
            <span>Back in {currentCard.interval} {currentCard.interval === 1 ? 'day' : 'days'}</span>
          </div>

          {/* Flashcard Box */}
          <div
            onClick={handleFlip}
            className="cursor-pointer min-h-[300px] sm:min-h-[340px] rounded-2xl bg-surface hover:bg-raised p-6 sm:p-8 flex flex-col justify-between transition-colors duration-200 ease-out relative group"
          >
            {/* Card Header */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">
                Year {currentCard.year} · {currentCard.courseCode}
              </span>
              <span className="text-xs text-slate-500 flex items-center gap-1 group-hover:text-slate-300 transition-colors">
                <RotateCw className="h-3.5 w-3.5" />
                Tap to flip
              </span>
            </div>

            {/* Card Content */}
            <div className="my-auto py-6 text-center max-w-xl mx-auto">
              {!isFlipped ? (
                <div>
                  <div className="text-sm text-muted mb-3">
                    Question
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white leading-relaxed">
                    <Inline text={currentCard.front} />
                  </h3>
                </div>
              ) : (
                <div className="animate-fade-in">
                  <div className="text-sm text-accent mb-3">
                    Answer
                  </div>
                  <p className="text-sm sm:text-base text-slate-200 leading-relaxed whitespace-pre-line">
                    <Inline text={currentCard.back} />
                  </p>
                </div>
              )}
            </div>

            {/* Card Footer */}
            <div className="text-center text-sm text-muted pt-3">
              {!isFlipped ? 'Think of the answer, then flip' : 'How easily did you recall it?'}
            </div>
          </div>

          {/* Recall Scoring Buttons (Visible only when flipped) */}
          {isFlipped ? (
            <div className="grid grid-cols-4 gap-2 pt-2 animate-fade-in">
              <button
                onClick={() => handleScore('again')}
                className="min-h-14 rounded-xl bg-surface ring-1 ring-line hover:bg-raised text-text p-3 text-center transition-colors"
              >
                <div className="text-sm font-medium">Again</div>
                <div className="text-xs text-muted">1 day</div>
              </button>

              <button
                onClick={() => handleScore('hard')}
                className="min-h-14 rounded-xl bg-surface ring-1 ring-line hover:bg-raised text-text p-3 text-center transition-colors"
              >
                <div className="text-sm font-medium">Hard</div>
                <div className="text-xs text-muted">+2 days</div>
              </button>

              <button
                onClick={() => handleScore('good')}
                className="min-h-14 rounded-xl bg-surface ring-1 ring-line hover:bg-raised text-text p-3 text-center transition-colors"
              >
                <div className="text-sm font-medium">Good</div>
                <div className="text-xs text-muted">+7 days</div>
              </button>

              <button
                onClick={() => handleScore('easy')}
                className="min-h-14 rounded-xl bg-accent text-ink hover:brightness-110 p-3 text-center transition-colors"
              >
                <div className="text-sm font-medium">Easy</div>
                <div className="text-xs text-ink/70">+14 days</div>
              </button>
            </div>
          ) : (
            <div className="text-center">
              <button
                onClick={handleFlip}
                className="min-h-11 rounded-xl bg-raised hover:bg-line text-text px-6 text-sm font-medium transition-colors"
              >
                Show answer
              </button>
            </div>
          )}

        </div>
      ) : (
        /* Session Completed Screen */
        <div className="rounded-2xl bg-surface p-10 text-center space-y-3">
          <Award className="mx-auto h-8 w-8 text-accent" />
          <h2 className="text-xl font-semibold text-text">Session done</h2>
          <p className="mx-auto max-w-sm text-sm text-muted">
            Your review dates are updated. The cards you found hard will come back sooner.
          </p>
          <div className="pt-3">
            <button
              onClick={resetSession}
              className="min-h-11 rounded-xl bg-accent px-6 text-sm font-semibold text-ink transition-[filter] hover:brightness-110"
            >
              Go again
            </button>
          </div>
        </div>
      )}

      {/* Create Flashcard Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg max-h-[85dvh] overflow-y-auto rounded-2xl bg-[#0f121a] border border-white/[0.08] p-6 shadow-2xl shadow-black/80 text-slate-200 animate-enter">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-white">Create Degree Flashcard</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="h-7 w-7 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCard} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Source Course Note
                </label>
                <select
                  value={newNoteId}
                  onChange={(e) => setNewNoteId(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  {notes.map(n => (
                    <option key={n.id} value={n.id}>
                      Year {n.year} · {n.courseId.replace('c-', '').toUpperCase()}: {n.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Front (Question / Prompt)
                </label>
                <textarea
                  rows={2}
                  required
                  value={newFront}
                  onChange={(e) => setNewFront(e.target.value)}
                  placeholder="e.g. What is the cut property in Minimum Spanning Trees?"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Back (Concise Answer / Key Formula)
                </label>
                <textarea
                  rows={3}
                  required
                  value={newBack}
                  onChange={(e) => setNewBack(e.target.value)}
                  placeholder="e.g. For any cut (S, V - S), the minimum-weight crossing edge belongs to the MST."
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl bg-slate-800 text-slate-400 px-4 py-2 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 text-xs font-semibold"
                >
                  Save Flashcard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
