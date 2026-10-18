import React, { useState } from 'react';
import { 
  Brain, 
  Sparkles, 
  Eye, 
  Trash2, 
  Plus, 
  CheckCircle, 
  AlertCircle, 
  Sliders, 
  Code, 
  BookOpen, 
  Clock, 
  Activity,
  Flame,
  Check
} from 'lucide-react';
import { LearningProfile, ExplanationStyle, AnswerLength, MemoryLogEntry } from '../types';
import { storage } from '../services/storage';

interface LearningProfileViewProps {
  profile: LearningProfile;
  setProfile: React.Dispatch<React.SetStateAction<LearningProfile>>;
  onLaunchTopicQuiz?: (topic: string) => void;
}

export const LearningProfileView: React.FC<LearningProfileViewProps> = ({
  profile,
  setProfile,
  onLaunchTopicQuiz,
}) => {
  const [newLogPrompt, setNewLogPrompt] = useState('');
  const [isAddLogOpen, setIsAddLogOpen] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  const updateProfileField = <K extends keyof LearningProfile>(key: K, value: LearningProfile[K]) => {
    setProfile(prev => {
      const updated = { ...prev, [key]: value };
      storage.saveProfile(updated);
      return updated;
    });
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const toggleLogActive = (id: string) => {
    setProfile(prev => {
      const updatedLogs = prev.memoryLogs.map(log => 
        log.id === id ? { ...log, isActive: !log.isActive } : log
      );
      const updated = { ...prev, memoryLogs: updatedLogs };
      storage.saveProfile(updated);
      return updated;
    });
  };

  const deleteLog = (id: string) => {
    setProfile(prev => {
      const updatedLogs = prev.memoryLogs.filter(log => log.id !== id);
      const updated = { ...prev, memoryLogs: updatedLogs };
      storage.saveProfile(updated);
      return updated;
    });
  };

  const handleAddManualLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogPrompt.trim()) return;

    const newLog: MemoryLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: 'Just now',
      trigger: 'Manual student preference',
      insight: newLogPrompt.trim(),
      category: 'habit',
      confidence: 1.0,
      isActive: true,
    };

    setProfile(prev => {
      const updated = {
        ...prev,
        memoryLogs: [newLog, ...prev.memoryLogs],
      };
      storage.saveProfile(updated);
      return updated;
    });

    setNewLogPrompt('');
    setIsAddLogOpen(false);
  };

  const markTopicMastered = (topicName: string) => {
    setProfile(prev => {
      const updatedTopics = prev.weakTopics.map(t => 
        t.topic === topicName ? { ...t, masteryLevel: 100, needsRevisit: false } : t
      );
      const updated = { ...prev, weakTopics: updatedTopics };
      storage.saveProfile(updated);
      return updated;
    });
  };

  return (
    <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
      
      {/* Toast Save Notification */}
      {saveToast && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 rounded-xl bg-emerald-500 text-slate-950 px-4 py-2 text-xs font-bold shadow-xl animate-bounce">
          <Check className="h-4 w-4" />
          <span>Learning Profile Updated</span>
        </div>
      )}

      {/* Banner Deck */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <Brain className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">{profile.studentName}’s Learning Engine</h1>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400 border border-emerald-500/30 font-semibold">
                  Transparent Profile
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {profile.degreeName} · {profile.university} · Final Year Student
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-800/80 border border-slate-700/60 px-3.5 py-2 text-center">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Questions Asked</div>
              <div className="text-base font-bold text-white">{profile.totalQuestionsAsked}</div>
            </div>
            <div className="rounded-xl bg-slate-800/80 border border-slate-700/60 px-3.5 py-2 text-center">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Active Streak</div>
              <div className="text-base font-bold text-amber-400 flex items-center justify-center gap-1">
                <Flame className="h-4 w-4 fill-amber-400" />
                {profile.studyStreaksDays}d
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 1: Interactive Cognitive Dials */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Explanation Style Dial */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="h-4 w-4 text-emerald-400" />
              Explanation Mode
            </h3>
            <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded font-mono">
              {profile.explanationStyle}
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-normal">
            Dictates how Grove structures answers when explaining new degree concepts.
          </p>

          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'code-first', label: 'Code-First', desc: 'Direct syntax & APIs' },
              { id: 'first-principles', label: 'First Principles', desc: 'Axioms & root mechanics' },
              { id: 'analogies', label: 'Analogies', desc: 'Physical world metaphors' },
              { id: 'academic', label: 'Formal / Academic', desc: 'Proof & rigor' },
              { id: 'socratic', label: 'Socratic Guiding', desc: 'Ask questions first' },
              { id: 'eli5', label: 'ELI5', desc: 'Simplified intuition' },
            ].map(style => (
              <button
                key={style.id}
                onClick={() => updateProfileField('explanationStyle', style.id as ExplanationStyle)}
                className={`p-2.5 rounded-xl text-left border transition-colors ${
                  profile.explanationStyle === style.id
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-white shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-semibold">{style.label}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{style.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Answer Density & Pacing */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-teal-400" />
              Answer Density & Preferences
            </h3>
            <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded font-mono">
              {profile.answerLength}
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-normal">
            Controls prose length and default programming language in examples.
          </p>

          {/* Density selection */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'concise', label: 'Concise', sub: 'Bullets only' },
              { id: 'balanced', label: 'Balanced', sub: 'Standard' },
              { id: 'deep-dive', label: 'Deep Dive', sub: 'Exhaustive' },
            ].map(d => (
              <button
                key={d.id}
                onClick={() => updateProfileField('answerLength', d.id as AnswerLength)}
                className={`p-2.5 rounded-xl text-center border transition-colors ${
                  profile.answerLength === d.id
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-white'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="text-xs font-semibold">{d.label}</div>
                <div className="text-[10px] text-slate-500">{d.sub}</div>
              </button>
            ))}
          </div>

          {/* Language preference input */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Code className="h-3.5 w-3.5 text-blue-400" />
              Preferred Code Stack
            </label>
            <input
              type="text"
              value={profile.codeLanguagePreference}
              onChange={(e) => updateProfileField('codeLanguagePreference', e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="pt-1 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-500" /> Peak study hours:
            </span>
            <span className="text-slate-200 font-medium">{profile.preferredStudyTime}</span>
          </div>
        </div>

      </div>

      {/* Section 2: Revisit Radar (Weak Topics to Revisit) */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-400" />
              Topics to Revisit (Spaced Diagnostic)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Identified through "I'm lost" queries or missed flashcards. Grove flags these for retention reinforcement.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {profile.weakTopics.map((topic, i) => (
            <div
              key={i}
              className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    {topic.courseCode} · Year {topic.year}
                  </span>
                  <span className="text-xs font-semibold text-slate-300">
                    {topic.masteryLevel}% mastery
                  </span>
                </div>

                <h4 className="text-xs font-bold text-slate-100 mt-1">
                  {topic.topic}
                </h4>

                {/* Progress bar */}
                <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      topic.masteryLevel > 80 ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${topic.masteryLevel}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 pt-2.5 border-t border-slate-800/60 flex items-center justify-between">
                <button
                  onClick={() => onLaunchTopicQuiz && onLaunchTopicQuiz(topic.topic)}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                >
                  <Sparkles className="h-3 w-3" />
                  Test recall
                </button>

                <button
                  onClick={() => markTopicMastered(topic.topic)}
                  className="text-[10px] text-slate-400 hover:text-slate-200"
                  title="Mark as comfortable"
                >
                  Mark solved
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Visible Transparent Memory Log */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Eye className="h-4 w-4 text-emerald-400" />
              Transparent Memory & Adaptation Audit Log
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Unlike black-box AI tutors, Grove lets you inspect, disable, or delete every inference it has made about your learning style.
            </p>
          </div>

          <button
            onClick={() => setIsAddLogOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 text-xs font-semibold border border-slate-700 self-start sm:self-auto transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Custom Rule</span>
          </button>
        </div>

        {/* Memory Logs List */}
        <div className="space-y-2.5">
          {profile.memoryLogs.map((log) => (
            <div
              key={log.id}
              className={`rounded-xl p-3.5 border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                log.isActive
                  ? 'bg-slate-950/80 border-slate-800 text-slate-200'
                  : 'bg-slate-950/30 border-slate-900 text-slate-500 opacity-60'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                    log.category === 'style' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                    log.category === 'weakness' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                    log.category === 'strength' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    {log.category}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">{log.trigger}</span>
                  <span className="text-[10px] text-slate-600">· {log.timestamp}</span>
                </div>
                <p className="text-xs font-semibold text-slate-100">
                  {log.insight}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  onClick={() => toggleLogActive(log.id)}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                    log.isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {log.isActive ? 'Active' : 'Disabled'}
                </button>
                <button
                  onClick={() => deleteLog(log.id)}
                  className="h-7 w-7 rounded-lg bg-slate-800/80 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700/60 flex items-center justify-center transition-colors"
                  title="Delete memory"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Manual Memory Modal */}
      {isAddLogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md max-h-[85dvh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">
              Teach Grove How You Learn
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Add an explicit preference or mental model that Grove should always respect.
            </p>

            <form onSubmit={handleAddManualLog} className="space-y-4">
              <textarea
                rows={3}
                required
                value={newLogPrompt}
                onChange={(e) => setNewLogPrompt(e.target.value)}
                placeholder="e.g. Always contrast concurrent algorithms with their single-threaded equivalents first."
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddLogOpen(false)}
                  className="rounded-xl bg-slate-800 text-slate-400 px-3 py-1.5 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 text-xs font-semibold"
                >
                  Add Observation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
