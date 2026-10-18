import React, { useState } from 'react';
import { 
  Compass, 
  Award, 
  Clock, 
  CheckCircle2, 
  Calendar, 
  BookmarkCheck, 
  Sparkles, 
  TrendingUp, 
  Brain, 
  User, 
  Flame,
  Zap,
  Check,
  Plus,
  X
} from 'lucide-react';
import { StudyBlueprint, StudentTier, WorkEthicArchetype } from '../types';
import { storage } from '../services/storage';

interface StudyBlueprintsViewProps {
  blueprints: StudyBlueprint[];
  setBlueprints: React.Dispatch<React.SetStateAction<StudyBlueprint[]>>;
}

export const StudyBlueprintsView: React.FC<StudyBlueprintsViewProps> = ({
  blueprints,
  setBlueprints,
}) => {
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [activeBlueprintId, setActiveBlueprintId] = useState<string>(blueprints[0]?.id || '');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  // New blueprint form state
  const [formName, setFormName] = useState('Alex Chimwaza');
  const [formTier, setFormTier] = useState<StudentTier>('A+');
  const [formArchetype, setFormArchetype] = useState<WorkEthicArchetype>('Consistent Daily Architect');
  const [formCourseCode, setFormCourseCode] = useState('CS202');
  const [formCourseName, setFormCourseName] = useState('Algorithms & Complexity');
  const [formWeeklyHours, setFormWeeklyHours] = useState(6);
  const [formPacing, setFormPacing] = useState('3 hours of whiteboard problem-solving every Tuesday and Saturday.');
  const [formExamDays, setFormExamDays] = useState(14);
  const [formQuote, setFormQuote] = useState('Draw the DAG for every recurrence before writing memoization code.');

  const activeBlueprint = blueprints.find(b => b.id === activeBlueprintId) || blueprints[0];

  const filteredBlueprints = blueprints.filter(bp => {
    if (selectedTier !== 'all' && bp.studentTier !== selectedTier) return false;
    if (selectedCourse !== 'all' && bp.courseCode !== selectedCourse) return false;
    return true;
  });

  const handleToggleAdopt = (id: string) => {
    const updated = storage.toggleAdoptBlueprint(id);
    setBlueprints(updated);

    const bp = updated.find(b => b.id === id);
    if (bp?.isAdopted) {
      setToastMessage(`Adopted ${bp.studentName}'s ${bp.courseCode} A+ Study Blueprint! Pacing schedule synchronized.`);
    } else {
      setToastMessage(`Unsubscribed from ${bp?.courseCode} blueprint.`);
    }
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCreateBlueprint = (e: React.FormEvent) => {
    e.preventDefault();
    const newBp: StudyBlueprint = {
      id: `bp-${Date.now()}`,
      studentName: formName.trim(),
      studentTier: formTier,
      archetype: formArchetype,
      courseCode: formCourseCode.trim(),
      courseName: formCourseName.trim(),
      overallGpa: '3.90 / 4.0',
      weeklyHours: Number(formWeeklyHours),
      pacingStrategy: formPacing.trim(),
      examPrepDaysBefore: Number(formExamDays),
      flashcardReviewCadence: 'Daily 15-minute active recall drill',
      summaryQuote: formQuote.trim(),
      recommendedHabits: [
        'Review lecture takeaways immediately after class.',
        'Adopt the Grove cross-year conceptual lineage queries.',
        'Build practice test scenarios with randomized inputs.'
      ],
      syllabusMilestones: [
        {
          week: 1,
          topic: 'Foundations & Invariants',
          focus: 'Master root mechanics and basic definitions.',
          workloadHours: formWeeklyHours,
          proTip: 'Focus on understanding axioms rather than syntax.',
        },
        {
          week: 6,
          topic: 'Midterm Core Architecture',
          focus: 'Solve past papers under timed conditions.',
          workloadHours: formWeeklyHours + 2,
          proTip: 'Target weakest subtopics identified by Grove Revisit Radar.',
        },
        {
          week: 12,
          topic: 'Final Exam Synthesis',
          focus: 'Full-curriculum active recall and integration.',
          workloadHours: formWeeklyHours + 3,
          proTip: 'Teach the concept to a junior peer to test your mastery.',
        }
      ],
      adoptedByCount: 1,
      isAdopted: true,
    };

    const updated = [newBp, ...blueprints];
    setBlueprints(updated);
    storage.saveBlueprints(updated);
    setActiveBlueprintId(newBp.id);
    setIsSubmitModalOpen(false);
    setToastMessage('Your Course Study Blueprint has been published for future cohorts!');
    setTimeout(() => setToastMessage(null), 3500);
  };

  const getTierColor = (tier: StudentTier) => {
    switch (tier) {
      case 'A+': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'A': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'B+': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'B': return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 rounded-xl bg-emerald-500 text-slate-950 px-4 py-2 text-xs font-bold shadow-2xl animate-bounce">
          <Check className="h-4 w-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/30 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-300 border border-amber-500/30">
              Cohort Intelligence
            </span>
            <span className="text-xs text-slate-400">Replicable High-Performance Patterns</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1 flex items-center gap-2">
            <Compass className="h-6 w-6 text-amber-400" />
            A+ Study Blueprints & Work Ethic Telemetry
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Grove records the actual study rhythms, revision pacing, and weekly habits of students who cleared each course with an A+ or A, making them adoptable as a personalized roadmap for students taking the course next.
          </p>
        </div>

        <button
          onClick={() => setIsSubmitModalOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 text-xs font-semibold shadow-lg shadow-amber-950/40 transition-colors self-start md:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Publish Course Blueprint</span>
        </button>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs text-slate-500 font-medium">Academic Tier:</span>
          {['all', 'A+', 'A', 'B+'].map(tier => (
            <button
              key={tier}
              onClick={() => setSelectedTier(tier)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                selectedTier === tier
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {tier === 'all' ? 'All Tiers' : `Tier ${tier}`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Filter Course:</span>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Courses</option>
            <option value="CS101">CS101: Systems & C</option>
            <option value="CS201">CS201: Operating Systems</option>
            <option value="CS301">CS301: Distributed Systems</option>
          </select>
        </div>
      </div>

      {/* Main Content Layout: Sidebar List + Deep-Dive Blueprint */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Blueprint Cards List */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            Available Course Blueprints ({filteredBlueprints.length})
          </h3>

          {filteredBlueprints.map(bp => (
            <div
              key={bp.id}
              onClick={() => setActiveBlueprintId(bp.id)}
              className={`cursor-pointer rounded-2xl p-4 border transition-[background-color,border-color,box-shadow] duration-200 ease-out ${
                activeBlueprint?.id === bp.id
                  ? 'bg-slate-900 border-amber-500/60 shadow-lg shadow-black/40'
                  : 'bg-slate-950/70 border-slate-800 hover:bg-slate-900/60 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getTierColor(bp.studentTier)}`}>
                  Tier {bp.studentTier} · {bp.overallGpa}
                </span>
                <span className="text-xs font-mono font-bold text-slate-300">
                  {bp.courseCode}
                </span>
              </div>

              <h4 className="text-sm font-bold text-white line-clamp-1">
                {bp.studentName}’s {bp.courseCode} Roadmap
              </h4>
              <p className="text-[11px] text-amber-400 font-medium mt-0.5">
                {bp.archetype}
              </p>

              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-slate-500" />
                  {bp.weeklyHours} hrs/wk
                </span>
                <span className="flex items-center gap-1 text-slate-500">
                  <BookmarkCheck className="h-3 w-3 text-emerald-400" />
                  {bp.adoptedByCount} juniors adopted
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Right Column: Deep-Dive Blueprint Inspector */}
        {activeBlueprint && (
          <div className="lg:col-span-2 space-y-5">
            
            {/* Header Deck */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getTierColor(activeBlueprint.studentTier)}`}>
                      Tier {activeBlueprint.studentTier} High Performer
                    </span>
                    <span className="text-xs text-slate-400">
                      {activeBlueprint.courseCode}: {activeBlueprint.courseName}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    {activeBlueprint.studentName}’s A+ Study Blueprint
                  </h2>
                </div>

                <button
                  onClick={() => handleToggleAdopt(activeBlueprint.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow ${
                    activeBlueprint.isAdopted
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-amber-600 hover:bg-amber-500 text-white'
                  }`}
                >
                  <BookmarkCheck className="h-4 w-4" />
                  <span>{activeBlueprint.isAdopted ? 'Blueprint Active (Adopted)' : 'Adopt This Blueprint'}</span>
                </button>
              </div>

              {/* Quote / Philosophy */}
              <blockquote className="rounded-xl bg-slate-950/80 border border-slate-800 p-3.5 text-xs text-amber-200/90 italic leading-relaxed">
                “{activeBlueprint.summaryQuote}”
              </blockquote>

              {/* Work Ethic Telemetry Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="rounded-xl bg-slate-950 p-3 border border-slate-800/80 text-center">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Weekly Study Time</div>
                  <div className="text-base font-bold text-white mt-1 flex items-center justify-center gap-1">
                    <Clock className="h-4 w-4 text-amber-400" />
                    {activeBlueprint.weeklyHours}h / wk
                  </div>
                </div>

                <div className="rounded-xl bg-slate-950 p-3 border border-slate-800/80 text-center">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Exam Prep Window</div>
                  <div className="text-base font-bold text-emerald-400 mt-1 flex items-center justify-center gap-1">
                    <Calendar className="h-4 w-4 text-emerald-400" />
                    {activeBlueprint.examPrepDaysBefore} days before
                  </div>
                </div>

                <div className="rounded-xl bg-slate-950 p-3 border border-slate-800/80 text-center">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Learner Archetype</div>
                  <div className="text-xs font-bold text-white mt-1 truncate" title={activeBlueprint.archetype}>
                    {activeBlueprint.archetype}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-950 p-3 border border-slate-800/80 text-center">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Active Recall Habit</div>
                  <div className="text-xs font-bold text-teal-400 mt-1 truncate" title={activeBlueprint.flashcardReviewCadence}>
                    Spaced Recall
                  </div>
                </div>
              </div>

              {/* Pacing Strategy */}
              <div className="pt-2">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
                  Pacing & Workload Strategy
                </div>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/50 p-3 rounded-xl border border-slate-800/60">
                  {activeBlueprint.pacingStrategy}
                </p>
              </div>

              {/* Recommended Habits */}
              <div className="pt-2">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                  Tactical Habits That Guaranteed The A+
                </div>
                <div className="space-y-1.5">
                  {activeBlueprint.recommendedHabits.map((habit, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{habit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Syllabus Roadmap Milestones */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-400" />
                14-Week Syllabus Execution Roadmap
              </h3>
              <p className="text-xs text-slate-400">
                How this student paced their workload week-by-week through the semester.
              </p>

              <div className="space-y-3">
                {activeBlueprint.syllabusMilestones.map((ms) => (
                  <div
                    key={ms.week}
                    className="rounded-xl bg-slate-950/70 border border-slate-800 p-4 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-mono font-bold text-amber-400">
                          Week {ms.week}
                        </span>
                        <h4 className="text-xs font-bold text-white">{ms.topic}</h4>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {ms.workloadHours} hrs required
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-normal">{ms.focus}</p>

                    <div className="pt-1 flex items-start gap-1.5 text-[11px] text-emerald-400/90 font-medium bg-emerald-950/20 p-2 rounded-lg border border-emerald-500/20">
                      <span className="font-bold shrink-0">Pro-Tip:</span>
                      <span>{ms.proTip}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Publish Blueprint Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-xl max-h-[90dvh] overflow-y-auto rounded-2xl bg-[#0f121a] border border-white/[0.08] p-6 shadow-2xl shadow-black/80 text-slate-200 animate-enter">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="h-4 w-4 text-amber-400" />
                Publish Your Course Study Blueprint
              </h3>
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="h-7 w-7 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Share the study cadence, weekly workload, and exam tactics that helped you clear this course.
            </p>

            <form onSubmit={handleCreateBlueprint} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Grade Earned</label>
                  <select
                    value={formTier}
                    onChange={(e) => setFormTier(e.target.value as StudentTier)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="A+">Tier A+ (90-100%)</option>
                    <option value="A">Tier A (80-89%)</option>
                    <option value="B+">Tier B+ (75-79%)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Course Code</label>
                  <input
                    type="text"
                    required
                    value={formCourseCode}
                    onChange={(e) => setFormCourseCode(e.target.value)}
                    placeholder="e.g. CS201"
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Course Name</label>
                  <input
                    type="text"
                    required
                    value={formCourseName}
                    onChange={(e) => setFormCourseName(e.target.value)}
                    placeholder="e.g. Operating Systems"
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Work Ethic Archetype</label>
                  <select
                    value={formArchetype}
                    onChange={(e) => setFormArchetype(e.target.value as WorkEthicArchetype)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Consistent Daily Architect">Consistent Daily Architect</option>
                    <option value="First-Principles Deep Diver">First-Principles Deep Diver</option>
                    <option value="Active Recall Specialist">Active Recall Specialist</option>
                    <option value="High-Intensity Sprinter">High-Intensity Sprinter</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Weekly Hours Spent</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={formWeeklyHours}
                    onChange={(e) => setFormWeeklyHours(Number(e.target.value))}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Pacing & Study Strategy</label>
                <textarea
                  rows={2}
                  required
                  value={formPacing}
                  onChange={(e) => setFormPacing(e.target.value)}
                  placeholder="e.g. 1 hour every morning before 10 AM; practice labs on virtual machines."
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Key Summary Philosophy / Quote</label>
                <input
                  type="text"
                  required
                  value={formQuote}
                  onChange={(e) => setFormQuote(e.target.value)}
                  placeholder="e.g. Internalize lock hierarchies before writing thread code."
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="rounded-xl bg-slate-800 text-slate-400 px-4 py-2 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-600 hover:bg-amber-500 text-white px-5 py-2 text-xs font-semibold"
                >
                  Publish Blueprint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
