import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { LearningProfile, ExplanationStyle, AnswerLength, MemoryLogEntry } from '../types';
import { storage } from '../services/storage';
import { PageHeader, Segmented, Disclosure, Modal, Toast, field, labelCls, primaryBtn, quietBtn } from './ui';

interface LearningProfileViewProps {
  profile: LearningProfile;
  setProfile: React.Dispatch<React.SetStateAction<LearningProfile>>;
  onLaunchTopicQuiz?: (topic: string) => void;
}

const STYLES: { id: ExplanationStyle; label: string; desc: string }[] = [
  { id: 'code-first', label: 'Code first', desc: 'Syntax and APIs up front' },
  { id: 'first-principles', label: 'First principles', desc: 'Start from the root mechanics' },
  { id: 'analogies', label: 'Analogies', desc: 'Everyday comparisons' },
  { id: 'academic', label: 'Formal', desc: 'Definitions and proofs' },
  { id: 'socratic', label: 'Socratic', desc: 'Questions before answers' },
  { id: 'eli5', label: 'Simple', desc: 'Plain-language intuition' },
];

const LENGTHS: { id: AnswerLength; label: string }[] = [
  { id: 'concise', label: 'Short' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'deep-dive', label: 'Detailed' },
];

const VISIBLE_TOPICS = 4;

export const LearningProfileView: React.FC<LearningProfileViewProps> = ({
  profile,
  setProfile,
  onLaunchTopicQuiz,
}) => {
  const [newNote, setNewNote] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showAllTopics, setShowAllTopics] = useState(false);

  const flash = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  const commit = (mutate: (p: LearningProfile) => LearningProfile) => {
    setProfile((prev) => {
      const updated = mutate(prev);
      storage.saveProfile(updated);
      return updated;
    });
  };

  const updateField = <K extends keyof LearningProfile>(key: K, value: LearningProfile[K]) => {
    commit((p) => ({ ...p, [key]: value }));
    flash('Saved');
  };

  const toggleLog = (id: string) =>
    commit((p) => ({
      ...p,
      memoryLogs: p.memoryLogs.map((l) => (l.id === id ? { ...l, isActive: !l.isActive } : l)),
    }));

  const deleteLog = (id: string) =>
    commit((p) => ({ ...p, memoryLogs: p.memoryLogs.filter((l) => l.id !== id) }));

  const addLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    const entry: MemoryLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: 'Just now',
      trigger: 'You added this',
      insight: newNote.trim(),
      category: 'habit',
      confidence: 1.0,
      isActive: true,
    };
    commit((p) => ({ ...p, memoryLogs: [entry, ...p.memoryLogs] }));
    setNewNote('');
    setIsAddOpen(false);
  };

  const markSolved = (topicName: string) =>
    commit((p) => ({
      ...p,
      weakTopics: p.weakTopics.map((t) =>
        t.topic === topicName ? { ...t, masteryLevel: 100, needsRevisit: false } : t
      ),
    }));

  const topics = showAllTopics ? profile.weakTopics : profile.weakTopics.slice(0, VISIBLE_TOPICS);
  const hiddenTopics = profile.weakTopics.length - VISIBLE_TOPICS;
  const activity = [
    `${profile.totalQuestionsAsked} ${profile.totalQuestionsAsked === 1 ? 'question' : 'questions'} asked`,
    profile.studyStreaksDays > 0 ? `${profile.studyStreaksDays}-day streak` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="w-full space-y-8">
      <Toast message={toast} />

      <PageHeader
        title="How I learn"
        subtitle={`These settings shape every answer. ${activity}.`}
      />

      <section className="space-y-4" aria-labelledby="style-h">
        <h2 id="style-h" className="text-lg font-semibold text-text">How Grove explains things</h2>
        <div role="radiogroup" aria-labelledby="style-h" className="grid gap-2 sm:grid-cols-2">
          {STYLES.map((s) => {
            const active = profile.explanationStyle === s.id;
            return (
              <button
                key={s.id}
                role="radio"
                aria-checked={active}
                onClick={() => updateField('explanationStyle', s.id)}
                className={`min-h-14 rounded-xl px-4 py-2.5 text-left transition-colors ${
                  active ? 'bg-raised ring-2 ring-accent/70' : 'bg-surface ring-1 ring-line hover:bg-raised'
                }`}
              >
                <span className="block text-sm font-medium text-text">{s.label}</span>
                <span className="block text-sm text-muted">{s.desc}</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-2 pt-2">
          <p className={labelCls}>Answer length</p>
          <Segmented
            label="Answer length"
            value={profile.answerLength}
            options={LENGTHS}
            onChange={(v) => updateField('answerLength', v)}
          />
        </div>

        <div className="max-w-xs pt-2">
          <label htmlFor="code-lang" className={labelCls}>Code examples in</label>
          <input
            id="code-lang"
            type="text"
            value={profile.codeLanguagePreference}
            onChange={(e) => updateField('codeLanguagePreference', e.target.value)}
            className={field}
          />
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="topics-h">
        <div>
          <h2 id="topics-h" className="text-lg font-semibold text-text">Topics to revisit</h2>
          <p className="text-sm text-muted">Added when you tap "I'm lost" or miss a flashcard.</p>
        </div>

        {profile.weakTopics.length === 0 ? (
          <p className="rounded-xl bg-surface p-4 text-sm text-muted">Nothing to revisit right now.</p>
        ) : (
          <ul className="divide-y divide-line">
            {topics.map((t) => (
              <li key={t.topic} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
                <div className="min-w-0 flex-1 basis-56">
                  <p className="font-medium text-text">{t.topic}</p>
                  <p className="text-sm text-muted">{t.courseCode} · Year {t.year}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2" aria-label={`${t.masteryLevel}% mastery`}>
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-raised">
                      <div
                        className={`h-full rounded-full ${t.masteryLevel > 80 ? 'bg-accent' : 'bg-warn'}`}
                        style={{ width: `${t.masteryLevel}%` }}
                      />
                    </div>
                    <span className="w-9 text-sm tabular-nums text-muted">{t.masteryLevel}%</span>
                  </div>
                  <button
                    onClick={() => onLaunchTopicQuiz?.(t.topic)}
                    className="min-h-9 rounded-lg px-3 text-sm font-medium text-accent hover:bg-surface"
                  >
                    Test recall
                  </button>
                  <button
                    onClick={() => markSolved(t.topic)}
                    className="min-h-9 rounded-lg px-3 text-sm text-muted hover:bg-surface hover:text-text"
                  >
                    Done
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {hiddenTopics > 0 && (
          <button
            onClick={() => setShowAllTopics((v) => !v)}
            className="min-h-9 text-sm text-muted hover:text-text"
          >
            {showAllTopics ? 'Show fewer' : `Show ${hiddenTopics} more`}
          </button>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="noticed-h">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="noticed-h" className="text-lg font-semibold text-text">What Grove has noticed</h2>
            <p className="text-sm text-muted">Turn off or delete anything you disagree with.</p>
          </div>
          <button onClick={() => setIsAddOpen(true)} className={quietBtn}>
            <Plus className="h-4 w-4" />
            Add your own
          </button>
        </div>

        <Disclosure summary={`${profile.memoryLogs.length} ${profile.memoryLogs.length === 1 ? 'observation' : 'observations'}`}>
          {profile.memoryLogs.length === 0 ? (
            <p className="rounded-xl bg-surface p-4 text-sm text-muted">Nothing yet. Grove notes things as you use it.</p>
          ) : (
            <ul className="divide-y divide-line">
              {profile.memoryLogs.map((log) => (
                <li key={log.id} className="flex items-start justify-between gap-4 py-3">
                  <div className={`min-w-0 ${log.isActive ? '' : 'opacity-50'}`}>
                    <p className="text-text">{log.insight}</p>
                    <p className="mt-0.5 text-sm text-muted">
                      {log.trigger} · {log.timestamp}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      role="switch"
                      aria-checked={log.isActive}
                      aria-label={log.isActive ? 'Turn off this observation' : 'Turn on this observation'}
                      onClick={() => toggleLog(log.id)}
                      className={`relative h-6 w-11 rounded-full transition-colors ${log.isActive ? 'bg-accent' : 'bg-raised'}`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${log.isActive ? 'left-[22px]' : 'left-0.5'}`}
                      />
                    </button>
                    <button
                      onClick={() => deleteLog(log.id)}
                      aria-label="Delete this observation"
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-text"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Disclosure>
      </section>

      {isAddOpen && (
        <Modal title="Teach Grove how you learn" onClose={() => setIsAddOpen(false)}>
          <form onSubmit={addLog} className="space-y-4">
            <div>
              <label htmlFor="obs" className={labelCls}>A preference Grove should always follow</label>
              <textarea
                id="obs"
                rows={3}
                required
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="e.g. Compare concurrent algorithms with the single-threaded version first."
                className={field}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setIsAddOpen(false)} className={quietBtn}>Cancel</button>
              <button type="submit" className={primaryBtn}>Add</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
