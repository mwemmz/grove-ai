import React, { useState } from 'react';
import { Copy, Check, Printer, ArrowUpRight, ExternalLink } from 'lucide-react';
import { LearningProfile, PortfolioSkill, PortfolioProject, Course, Note, GraduationCV } from '../types';
import { portfolioService } from '../services/portfolioService';
import { PageHeader, Segmented, Disclosure, Modal, primaryBtn, quietBtn } from './ui';

interface PortfolioViewProps {
  profile: LearningProfile;
  skills: PortfolioSkill[];
  projects: PortfolioProject[];
  courses: Course[];
  notes: Note[];
  onOpenNoteDetail?: (note: Note) => void;
}

const YEAR_RINGS = [
  { year: 1, title: 'Foundations', desc: 'Manual memory, C pointers, discrete logic, hash tables.' },
  { year: 2, title: 'Core systems', desc: 'Operating systems, semaphores, dynamic programming, deadlocks.' },
  { year: 3, title: 'Distributed', desc: 'Raft consensus, LSM storage engines, state machines.' },
  { year: 4, title: 'Production', desc: 'Zero-copy event streaming, TLS 1.3 capstone.' },
];

export const PortfolioView: React.FC<PortfolioViewProps> = ({
  profile,
  skills,
  projects,
  courses,
  notes,
  onOpenNoteDetail,
}) => {
  const [mode, setMode] = useState<'overview' | 'cv'>('overview');
  const [copied, setCopied] = useState(false);
  const [openSkill, setOpenSkill] = useState<PortfolioSkill | null>(null);

  const cv: GraduationCV = portfolioService.generateGraduationCV(
    profile.studentName,
    profile.degreeName,
    profile.university,
    skills,
    projects,
    courses,
    notes
  );
  const markdown = portfolioService.exportCVToMarkdown(cv);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard blocked: the Markdown below can still be selected by hand */
    }
  };

  const categories = Array.from(new Set(skills.map((s) => s.category)));

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Portfolio & CV"
        subtitle="Built from your notes. Each skill links back to the notes that back it up."
        action={
          <Segmented
            label="Portfolio view"
            value={mode}
            onChange={setMode}
            options={[
              { id: 'overview', label: 'Overview' },
              { id: 'cv', label: 'CV' },
            ]}
          />
        }
      />

      {mode === 'overview' && (
        <>
          <section aria-labelledby="years-h" className="space-y-3">
            <h2 id="years-h" className="text-lg font-semibold text-text">Your four years</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
              {YEAR_RINGS.map((y) => {
                const count = notes.filter((n) => n.year === y.year).length;
                return (
                  <div key={y.year} className="border-t border-line pt-3">
                    <p className="text-sm text-muted">Year {y.year}</p>
                    <p className="mt-0.5 font-medium text-text">{y.title}</p>
                    <p className="mt-1 text-sm leading-6 text-muted">{y.desc}</p>
                    <p className="mt-2 text-sm text-accent">
                      {count} {count === 1 ? 'note' : 'notes'}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="skills-h" className="space-y-4">
            <h2 id="skills-h" className="text-lg font-semibold text-text">Skills</h2>
            {categories.map((cat) => (
              <div key={cat}>
                <h3 className="text-sm text-muted">{cat}</h3>
                <ul className="mt-1 divide-y divide-line">
                  {skills
                    .filter((s) => s.category === cat)
                    .map((s) => (
                      <li key={s.name}>
                        <button
                          onClick={() => setOpenSkill(s)}
                          className="-mx-3 flex w-[calc(100%+1.5rem)] items-center justify-between gap-4 rounded-xl px-3 py-3 text-left transition-colors hover:bg-surface"
                        >
                          <span className="min-w-0">
                            <span className="block font-medium text-text">{s.name}</span>
                            <span className="block text-sm text-muted">
                              Year {s.firstAcquiredYear} · {s.evidenceNotes.length}{' '}
                              {s.evidenceNotes.length === 1 ? 'note' : 'notes'}
                            </span>
                          </span>
                          <span className="flex shrink-0 items-center gap-2 text-sm text-muted">
                            {s.level}
                            <ArrowUpRight className="h-4 w-4" />
                          </span>
                        </button>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </section>

          <section aria-labelledby="proj-h" className="space-y-3">
            <h2 id="proj-h" className="text-lg font-semibold text-text">Projects</h2>
            <ul className="space-y-3">
              {projects.map((p) => (
                <li key={p.id} className="rounded-xl bg-surface p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                    <h3 className="font-medium text-text">{p.title}</h3>
                    <span className="text-sm text-muted">{p.courseCode} · Year {p.year}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted">{p.description}</p>
                  <p className="mt-2 font-mono text-[13px] text-muted">{p.technologies.join(' · ')}</p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <Disclosure summary="Outcomes">
                      <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-text">
                        {p.outcomes.map((o, i) => (
                          <li key={i}>{o}</li>
                        ))}
                      </ul>
                    </Disclosure>
                    {p.githubUrl && (
                      <a
                        href={p.githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-9 items-center gap-1.5 text-sm text-accent hover:underline"
                      >
                        Repository <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {mode === 'cv' && (
        <section className="space-y-5">
          <div className="flex flex-wrap gap-2 no-print">
            <button onClick={copy} className={primaryBtn}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy as Markdown'}
            </button>
            <button onClick={() => window.print()} className={quietBtn}>
              <Printer className="h-4 w-4" />
              Print or save as PDF
            </button>
          </div>

          <article className="space-y-6 rounded-xl bg-white p-6 text-slate-900 sm:p-10">
            <header className="border-b border-slate-200 pb-4">
              <h2 className="text-2xl font-semibold tracking-tight">{cv.name}</h2>
              <p className="mt-1 font-medium text-emerald-800">{cv.headline}</p>
              <p className="mt-1 text-sm text-slate-600">
                {cv.education.degree} · {cv.education.institution} · {cv.education.years}
              </p>
            </header>

            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Education</h3>
              <p className="font-medium">{cv.education.degree}, {cv.education.institution}</p>
              <p className="text-sm text-emerald-800">{cv.education.gpaOrHonors}</p>
              <ul className="space-y-1 pt-1 text-sm text-slate-600">
                {cv.education.courseworkByYear.map((cw) => (
                  <li key={cw.year}>
                    <span className="font-medium text-slate-800">Year {cw.year}: </span>
                    {cw.courses.join(', ')}
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Skills</h3>
              <ul className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                {cv.skills.map((s, i) => (
                  <li key={i}>
                    <span className="font-medium">{s.name}</span> ({s.level})
                    <span className="block text-slate-500">
                      Year {s.firstAcquiredYear} · {s.evidenceNotes.map((n) => n.courseCode).join(', ')}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Projects</h3>
              {cv.projects.map((p) => (
                <div key={p.id} className="space-y-1 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                    <span className="font-semibold">{p.title}</span>
                    <span className="text-slate-500">{p.courseCode} · Year {p.year}</span>
                  </div>
                  <p className="text-slate-600">{p.description}</p>
                  <p className="font-mono text-xs text-emerald-800">{p.technologies.join(', ')}</p>
                  <ul className="list-disc space-y-0.5 pl-5 text-slate-700">
                    {p.outcomes.map((o, i) => (
                      <li key={i}>{o}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>

            {cv.academicHighlights.length > 0 && (
              <section className="space-y-1 border-t border-slate-100 pt-4 text-sm text-slate-600">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Highlights</h3>
                {cv.academicHighlights.map((h, i) => (
                  <p key={i}>• {h}</p>
                ))}
              </section>
            )}
          </article>

          <div className="no-print">
            <Disclosure summary="Show the Markdown version">
              <pre className="max-h-[60dvh] overflow-auto rounded-xl bg-surface p-5 font-mono text-[13px] leading-6 text-text">
                {markdown}
              </pre>
            </Disclosure>
          </div>
        </section>
      )}

      {openSkill && (
        <Modal title={openSkill.name} onClose={() => setOpenSkill(null)}>
          <p className="text-sm text-muted">
            {openSkill.level} · first shown in Year {openSkill.firstAcquiredYear}. These notes back it up:
          </p>
          <ul className="mt-3 divide-y divide-line">
            {openSkill.evidenceNotes.map((ev, i) => {
              const full = notes.find((n) => n.id === ev.noteId);
              return (
                <li key={i}>
                  <button
                    disabled={!full}
                    onClick={() => {
                      if (full) {
                        setOpenSkill(null);
                        onOpenNoteDetail?.(full);
                      }
                    }}
                    className="-mx-2 flex w-[calc(100%+1rem)] items-center justify-between gap-3 rounded-lg px-2 py-3 text-left hover:bg-raised disabled:opacity-60"
                  >
                    <span className="min-w-0">
                      <span className="block font-medium text-text">{ev.title}</span>
                      <span className="block text-sm text-muted">
                        {ev.courseCode}
                        {full ? ` · ${full.summary.slice(0, 80)}` : ''}
                      </span>
                    </span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-muted" />
                  </button>
                </li>
              );
            })}
          </ul>
        </Modal>
      )}
    </div>
  );
};
