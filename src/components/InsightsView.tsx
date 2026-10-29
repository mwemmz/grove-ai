/* For lecturers: where the class is getting stuck, as anonymous totals from students who chose to share.
   Grove never shows who, never shows questions, and hides any topic with fewer than 3 students. */
import { useEffect, useState } from 'react';
import { EyeOff, ShieldCheck } from 'lucide-react';
import { apiGet } from '../lib/api';
import { EmptyState } from './EmptyState';
import { Segmented } from './ui';

interface Topic {
  topic: string;
  note: string | null;
  students: number;
  asked: number;
  lost: number;
  recall_missed: number;
  check_missed: number;
  overconfident: number;
  check_right: number;
  stuck: number;
}
interface Insights {
  days: number;
  minStudents: number;
  courses: { course: string; students: number; signals: number }[];
  topics: Topic[];
  hidden: number;
}

const PERIODS = [
  { id: '7', label: 'This week' },
  { id: '30', label: '30 days' },
  { id: '90', label: 'Term' },
];

export function InsightsView() {
  const [days, setDays] = useState('30');
  const [course, setCourse] = useState<string>('');
  const [data, setData] = useState<Insights | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setError(null);
    apiGet<Insights>(`/insights?days=${days}${course ? `&course=${encodeURIComponent(course)}` : ''}`)
      .then((d) => {
        if (!live) return;
        setData(d);
        if (!course && d.courses[0]) setCourse(d.courses[0].course);
      })
      .catch((e) => live && setError(String(e.message ?? e)));
    return () => {
      live = false;
    };
  }, [days, course]);

  const max = Math.max(1, ...(data?.topics ?? []).map((t) => t.students));
  const current = data?.courses.find((c) => c.course === course);

  return (
    <div className="view-enter space-y-5">
      <header className="space-y-1">
        <h1 className="font-display text-3xl tracking-tight text-text sm:text-4xl">Where the class is stuck</h1>
        <p className="max-w-2xl text-sm text-muted">
          Anonymous totals from students who chose to share. A topic rises when students say they are lost, miss it in Recall, or get it wrong in the weekly check.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <Segmented value={days} onChange={setDays} options={PERIODS} label="Period" />
        {data && data.courses.length > 0 && (
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Course">
            {data.courses.map((c) => (
              <button
                key={c.course}
                role="radio"
                aria-checked={c.course === course}
                onClick={() => setCourse(c.course)}
                className={`min-h-9 rounded-full px-4 text-sm ring-1 ${c.course === course ? 'bg-accent text-ink ring-accent' : 'bg-surface text-text ring-edge hover:bg-raised'}`}
              >
                {c.course}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="rounded-2xl bg-warn/10 p-4 text-sm text-text ring-1 ring-warn/50">Could not load insights. {error}</p>}

      {data && data.courses.length === 0 && (
        <EmptyState title="Nothing shared yet" text="Totals appear here once students using your course notes choose to share and start studying." />
      )}

      {data && current && (
        <p className="text-sm text-muted">
          <span className="font-semibold text-text">{current.students}</span> {current.students === 1 ? 'student' : 'students'} sharing in {current.course} over {data.days === 7 ? 'the last week' : `the last ${data.days} days`}.
        </p>
      )}

      {data && course && data.topics.length === 0 && data.courses.length > 0 && (
        <p className="glass rounded-[24px] p-5 text-sm text-muted ring-1 ring-line/80">
          No topic has {data.minStudents} or more students yet, so nothing can be shown without risking who it is.
        </p>
      )}

      {data && data.topics.length > 0 && (
        <ol className="stagger space-y-2">
          {data.topics.map((t, k) => (
            <li key={`${t.note}-${t.topic}`} className="glass rounded-[20px] p-4 ring-1 ring-line/80">
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 text-text">
                  <span className="mr-2 font-mono text-xs text-muted">{k + 1}</span>
                  <span className="font-semibold">{t.topic}</span>
                  {t.note && t.note !== t.topic && <span className="text-muted"> · {t.note}</span>}
                </p>
                <p className="shrink-0 text-sm text-muted">{t.students} students</p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-raised" aria-hidden>
                <div className="h-full rounded-full bg-accent" style={{ width: `${(t.stuck / max) * 100}%` }} />
              </div>
              <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                <span><b className="text-text">{t.stuck}</b> stuck</span>
                {t.lost > 0 && <span>{t.lost} said “I'm lost”</span>}
                {t.recall_missed > 0 && <span>{t.recall_missed} missed in Recall</span>}
                {t.check_missed > 0 && <span>{t.check_missed} wrong in the weekly check</span>}
                {t.overconfident > 0 && <span className="text-warn">{t.overconfident} wrong but sure</span>}
                {t.asked > 0 && <span>{t.asked} asked about it</span>}
              </p>
            </li>
          ))}
        </ol>
      )}

      {data && data.hidden > 0 && (
        <p className="flex items-center gap-2 text-xs text-muted">
          <EyeOff aria-hidden className="h-4 w-4" /> {data.hidden} more {data.hidden === 1 ? 'topic has' : 'topics have'} fewer than {data.minStudents} students and {data.hidden === 1 ? 'is' : 'are'} hidden.
        </p>
      )}

      <p className="flex items-start gap-2 border-t border-line pt-4 text-xs text-muted">
        <ShieldCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
        Grove keeps only a topic, a kind of signal and a weekly code that can't be traced back to a student. No names, IDs, questions or answers. Students can stop sharing at any time.
      </p>
    </div>
  );
}
