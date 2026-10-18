import React, { useState } from 'react';
import { 
  GraduationCap, 
  FileText, 
  Copy, 
  Check, 
  Download, 
  ExternalLink, 
  Award, 
  Briefcase, 
  Code2, 
  CheckCircle2, 
  Layers, 
  Calendar,
  Sparkles,
  TreePine,
  ArrowUpRight
} from 'lucide-react';
import { 
  LearningProfile, 
  PortfolioSkill, 
  PortfolioProject, 
  Course, 
  Note, 
  GraduationCV 
} from '../types';
import { portfolioService } from '../services/portfolioService';

interface PortfolioViewProps {
  profile: LearningProfile;
  skills: PortfolioSkill[];
  projects: PortfolioProject[];
  courses: Course[];
  notes: Note[];
  onOpenNoteDetail?: (note: Note) => void;
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({
  profile,
  skills,
  projects,
  courses,
  notes,
  onOpenNoteDetail,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'showcase' | 'cv-preview' | 'markdown'>('showcase');
  const [copied, setCopied] = useState(false);
  const [selectedEvidenceSkill, setSelectedEvidenceSkill] = useState<PortfolioSkill | null>(null);

  const cvData: GraduationCV = portfolioService.generateGraduationCV(
    profile.studentName,
    profile.degreeName,
    profile.university,
    skills,
    projects,
    courses,
    notes
  );

  const markdownCV = portfolioService.exportCVToMarkdown(cvData);

  const handleCopy = () => {
    navigator.clipboard.writeText(markdownCV);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/30">
              Graduation Ready
            </span>
            <span className="text-xs text-slate-400">Class of 2026</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">
            4-Year Academic Portfolio & CV
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Grove transforms your 4 years of course notes, code implementations, and project takeaways into an evidence-backed technical portfolio.
          </p>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-950 p-1 border border-slate-800 shrink-0">
          <button
            onClick={() => setActiveSubTab('showcase')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeSubTab === 'showcase'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Portfolio
          </button>
          <button
            onClick={() => setActiveSubTab('cv-preview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeSubTab === 'cv-preview'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Formatted CV
          </button>
          <button
            onClick={() => setActiveSubTab('markdown')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeSubTab === 'markdown'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Markdown / Export
          </button>
        </div>
      </div>

      {/* VIEW 1: PORTFOLIO SHOWCASE */}
      {activeSubTab === 'showcase' && (
        <div className="space-y-6">
          
          {/* Tree Rings Degree Progression */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <TreePine className="h-5 w-5 text-emerald-400" />
              <h2 className="text-base font-bold text-white">4-Year Tree Rings of Growth</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { year: 1, ring: 'Ring 1: Foundations', badge: 'Year 1', desc: 'Manual memory, C pointers, discrete logic, hash tables.', count: notes.filter(n => n.year === 1).length, color: 'border-blue-500/40 text-blue-400 bg-blue-500/10' },
                { year: 2, ring: 'Ring 2: Core Systems', badge: 'Year 2', desc: 'Operating systems, semaphores, dynamic programming, deadlocks.', count: notes.filter(n => n.year === 2).length, color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' },
                { year: 3, ring: 'Ring 3: Distributed', badge: 'Year 3', desc: 'Raft consensus, LSM storage engines, state machines.', count: notes.filter(n => n.year === 3).length, color: 'border-amber-500/40 text-amber-400 bg-amber-500/10' },
                { year: 4, ring: 'Ring 4: Production', badge: 'Year 4', desc: 'Zero-copy event streaming, TLS 1.3 cryptography capstone.', count: notes.filter(n => n.year === 4).length, color: 'border-purple-500/40 text-purple-400 bg-purple-500/10' },
              ].map((yr) => (
                <div
                  key={yr.year}
                  className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${yr.color}`}>
                        {yr.badge}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {yr.count} verified notes
                      </span>
                    </div>
                    <div className="text-xs font-bold text-white">{yr.ring}</div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-normal">{yr.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Evidence-Backed Technical Skills Grid */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-400" />
                  Verified Skills Matrix (Evidence-Backed)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Every technical competency is grounded in your actual course notes and lab deliverables. Click any skill to inspect the proof.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {skills.map((skill, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedEvidenceSkill(skill)}
                  className="cursor-pointer rounded-xl bg-slate-950/60 hover:bg-slate-950 border border-slate-800/80 hover:border-emerald-500/40 p-4 transition-colors flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {skill.category}
                      </span>
                      <span className="rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 border border-emerald-500/20">
                        {skill.level}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-100 group-hover:text-emerald-300 transition-colors">
                      {skill.name}
                    </h4>

                    <div className="text-[11px] text-slate-500 mt-1">
                      Acquired in Year {skill.firstAcquiredYear}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-emerald-400">
                    <span>{skill.evidenceNotes.length} notes cited as proof</span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Capstone & Academic Projects */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 shadow-xl space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-blue-400" />
              Capstone & Systems Projects
            </h2>

            <div className="space-y-4">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  className="rounded-xl bg-slate-950/60 border border-slate-800 p-5 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">{proj.title}</h3>
                      <span className="rounded bg-slate-800 text-slate-300 px-2 py-0.5 text-[10px] font-bold">
                        {proj.courseCode} · Year {proj.year}
                      </span>
                    </div>

                    {proj.githubUrl && (
                      <a
                        href={proj.githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 self-start sm:self-auto"
                      >
                        <span>View Repository</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {proj.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {proj.technologies.map((t, i) => (
                      <span key={i} className="rounded bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-300 font-mono">
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-800/60 space-y-1">
                    {proj.outcomes.map((out, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-400">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{out}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* VIEW 2: FORMATTED CV PREVIEW */}
      {activeSubTab === 'cv-preview' && (
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-1.5 text-xs font-semibold border border-slate-700 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 text-xs font-semibold shadow transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied Markdown' : 'Copy CV'}</span>
            </button>
          </div>

          <div className="rounded-2xl bg-white text-slate-900 p-8 sm:p-12 shadow-2xl max-w-4xl mx-auto space-y-6 border border-slate-200">
            {/* CV Header */}
            <div className="border-b border-slate-200 pb-4">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">{cvData.name}</h1>
              <p className="text-sm font-semibold text-emerald-700 mt-1">{cvData.headline}</p>
              <div className="text-xs text-slate-600 mt-1 flex flex-wrap gap-3">
                <span>🎓 {cvData.education.degree}</span>
                <span>🏛 {cvData.education.institution}</span>
                <span>📅 {cvData.education.years}</span>
              </div>
            </div>

            {/* Education & Coursework */}
            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
                Education & Degree-Long Curriculum
              </h2>
              <div className="text-sm font-bold text-slate-800">
                {cvData.education.degree}, {cvData.education.institution}
              </div>
              <div className="text-xs text-emerald-700 font-medium">
                {cvData.education.gpaOrHonors}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-xs text-slate-600">
                {cvData.education.courseworkByYear.map(cw => (
                  <div key={cw.year} className="bg-slate-50 p-2 rounded border border-slate-100">
                    <span className="font-bold text-slate-800">Year {cw.year}: </span>
                    <span>{cw.courses.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Verified Skills */}
            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
                Verified Technical Competencies
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
                {cvData.skills.map((s, i) => (
                  <div key={i} className="flex flex-col">
                    <span className="font-bold text-slate-900">{s.name} ({s.level})</span>
                    <span className="text-[11px] text-slate-500">
                      Acquired Year {s.firstAcquiredYear} · Coursework: {s.evidenceNotes.map(n => n.courseCode).join(', ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Projects */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
                Systems & Capstone Projects
              </h2>
              {cvData.projects.map(p => (
                <div key={p.id} className="text-xs space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-slate-900 text-sm">{p.title}</span>
                    <span className="text-slate-500 font-medium">{p.courseCode} · Year {p.year}</span>
                  </div>
                  <p className="text-slate-600 leading-normal">{p.description}</p>
                  <p className="text-[11px] text-emerald-800 font-mono">Stack: {p.technologies.join(', ')}</p>
                  <ul className="list-disc list-inside text-slate-700 pl-1 space-y-0.5">
                    {p.outcomes.map((out, idx) => (
                      <li key={idx}>{out}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Academic Highlights */}
            <div className="space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600">
              <div className="font-bold text-slate-800 uppercase text-[11px]">Academic Rigor</div>
              {cvData.academicHighlights.map((hl, i) => (
                <p key={i}>• {hl}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: MARKDOWN EXPORT */}
      {activeSubTab === 'markdown' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Ready-to-paste markdown CV with live degree citations for your GitHub profile or website.
            </p>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-xs font-semibold shadow transition-colors"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Raw Markdown'}</span>
            </button>
          </div>

          <pre className="rounded-2xl bg-slate-950 border border-slate-800 p-6 text-xs text-emerald-300 font-mono overflow-x-auto max-h-[70dvh] leading-relaxed">
            {markdownCV}
          </pre>
        </div>
      )}

      {/* Evidence Drawer Modal */}
      {selectedEvidenceSkill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-xl max-h-[85dvh] overflow-y-auto rounded-2xl bg-[#0f121a] border border-white/[0.08] p-6 shadow-2xl shadow-black/80 text-slate-200 animate-enter">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">{selectedEvidenceSkill.name}</h3>
              </div>
              <span className="rounded bg-emerald-500/10 text-emerald-400 text-xs font-bold px-2 py-0.5 border border-emerald-500/20">
                {selectedEvidenceSkill.level}
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              First demonstrated in **Year {selectedEvidenceSkill.firstAcquiredYear}**. Here are the verified notes and course assignments that substantiate this skill:
            </p>

            <div className="space-y-2.5">
              {selectedEvidenceSkill.evidenceNotes.map((ev, i) => {
                const fullNote = notes.find(n => n.id === ev.noteId);
                return (
                  <div
                    key={i}
                    onClick={() => {
                      if (fullNote && onOpenNoteDetail) {
                        setSelectedEvidenceSkill(null);
                        onOpenNoteDetail(fullNote);
                      }
                    }}
                    className="cursor-pointer rounded-xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800/80 hover:border-emerald-500/50 p-3.5 transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                          {ev.courseCode}
                        </span>
                        <span className="text-xs font-semibold text-slate-200 group-hover:text-emerald-300">
                          {ev.title}
                        </span>
                      </div>
                      {fullNote && (
                        <p className="text-[11px] text-slate-500 line-clamp-1">{fullNote.summary}</p>
                      )}
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-slate-500 group-hover:text-emerald-400 shrink-0 ml-2" />
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSelectedEvidenceSkill(null)}
                className="rounded-xl bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
