import React, { useState } from 'react';
import { 
  Repeat, 
  RotateCw, 
  Check, 
  Sparkles, 
  Flame, 
  Award, 
  BookOpen,
  Plus,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Flashcard, Note, AcademicYear } from '../types';
import { storage } from '../services/storage';

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
      // Trigger confetti celebration!
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
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
      confetti({
        particleCount: 120,
        spread: 100,
        origin: { y: 0.6 }
      });
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
    <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Repeat className="h-5 w-5 text-emerald-400" />
            <h2 className="text-xl font-bold text-white">Degree Spaced Recall</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Active recall flashcards generated directly from your 4-year degree notes using SuperMemo spaced repetition.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 text-xs font-semibold border border-slate-700 self-start sm:self-auto transition"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Flashcard</span>
        </button>
      </div>

      {/* Year Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => { setSelectedYear('all'); resetSession(); }}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition shrink-0 ${
            selectedYear === 'all'
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-900 text-slate-400 border border-slate-800'
          }`}
        >
          All Decks ({flashcards.length})
        </button>

        {[1, 2, 3, 4].map(yr => {
          const count = flashcards.filter(c => c.year === yr).length;
          return (
            <button
              key={yr}
              onClick={() => { setSelectedYear(yr); resetSession(); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition shrink-0 ${
                selectedYear === yr
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 text-slate-400 border border-slate-800'
              }`}
            >
              Year {yr} ({count})
            </button>
          );
        })}
      </div>

      {/* Card Arena */}
      {!sessionCompleted && currentCard ? (
        <div className="space-y-4">
          
          {/* Progress Tracker */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Card {currentIndex + 1} of {activeDeck.length}</span>
            <span className="font-mono text-emerald-400 font-bold">
              Interval: {currentCard.interval} days
            </span>
          </div>

          {/* Flashcard Box */}
          <div
            onClick={handleFlip}
            className="cursor-pointer min-h-[300px] sm:min-h-[340px] rounded-3xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 p-8 flex flex-col justify-between shadow-2xl transition-all duration-300 relative group"
          >
            {/* Card Header */}
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-bold px-2 py-0.5 border border-emerald-500/20">
                Year {currentCard.year} · {currentCard.courseCode}
              </span>
              <span className="text-xs text-slate-500 flex items-center gap-1 group-hover:text-slate-300 transition">
                <RotateCw className="h-3.5 w-3.5" />
                Click anywhere to flip
              </span>
            </div>

            {/* Card Content */}
            <div className="my-auto py-6 text-center max-w-xl mx-auto">
              {!isFlipped ? (
                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                    Question / Prompt
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white leading-relaxed">
                    {currentCard.front}
                  </h3>
                </div>
              ) : (
                <div className="animate-fade-in">
                  <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest mb-3">
                    Answer & Mechanics
                  </div>
                  <p className="text-sm sm:text-base text-slate-200 leading-relaxed whitespace-pre-line">
                    {currentCard.back}
                  </p>
                </div>
              )}
            </div>

            {/* Card Footer */}
            <div className="text-center text-[11px] text-slate-500 border-t border-slate-800/80 pt-3">
              {!isFlipped ? 'Reveal solution to score recall' : 'Rate how easily you recalled this'}
            </div>
          </div>

          {/* Recall Scoring Buttons (Visible only when flipped) */}
          {isFlipped ? (
            <div className="grid grid-cols-4 gap-2 pt-2 animate-fade-in">
              <button
                onClick={() => handleScore('again')}
                className="rounded-xl bg-slate-900 hover:bg-rose-950/60 border border-rose-500/30 text-rose-400 p-3 text-center transition"
              >
                <div className="text-xs font-bold">Again</div>
                <div className="text-[10px] text-slate-500">1 day</div>
              </button>

              <button
                onClick={() => handleScore('hard')}
                className="rounded-xl bg-slate-900 hover:bg-amber-950/60 border border-amber-500/30 text-amber-400 p-3 text-center transition"
              >
                <div className="text-xs font-bold">Hard</div>
                <div className="text-[10px] text-slate-500">+2 days</div>
              </button>

              <button
                onClick={() => handleScore('good')}
                className="rounded-xl bg-slate-900 hover:bg-blue-950/60 border border-blue-500/30 text-blue-400 p-3 text-center transition"
              >
                <div className="text-xs font-bold">Good</div>
                <div className="text-[10px] text-slate-500">+7 days</div>
              </button>

              <button
                onClick={() => handleScore('easy')}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white p-3 text-center transition shadow-lg shadow-emerald-900/30"
              >
                <div className="text-xs font-bold flex items-center justify-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Easy
                </div>
                <div className="text-[10px] text-emerald-200">+14 days</div>
              </button>
            </div>
          ) : (
            <div className="text-center">
              <button
                onClick={handleFlip}
                className="rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 px-6 py-2.5 text-xs font-semibold shadow transition"
              >
                Show Solution (Spacebar or Click)
              </button>
            </div>
          )}

        </div>
      ) : (
        /* Session Completed Screen */
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-12 text-center space-y-4 shadow-2xl">
          <div className="h-16 w-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
            <Award className="h-8 w-8" />
          </div>
          <h3 className="text-2xl font-bold text-white">Review Session Complete!</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            You just reinforced degree-long retention. Spaced repetition intervals have been recalculated and saved to your profile.
          </p>
          <div className="pt-4">
            <button
              onClick={resetSession}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 text-xs font-semibold shadow-lg shadow-emerald-900/30 transition"
            >
              Start Another Round
            </button>
          </div>
        </div>
      )}

      {/* Create Flashcard Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-2xl bg-[#0f121a] border border-white/[0.08] p-6 shadow-2xl shadow-black/80 text-slate-200 animate-enter">
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
