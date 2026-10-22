import React, { useEffect, useRef, useState } from 'react';
import { FileUp, Search, Trash2 } from 'lucide-react';
import {
  KIND_LABEL,
  addSource,
  getSources,
  removeSource,
  searchSources,
  type Hit,
  type Source,
  type SourceKind,
} from '../services/knowledge';
import { ACCEPT, extractText } from '../services/fileText';
import { Disclosure, PageHeader, Segmented, chip, field, labelCls, panel, primaryBtn, quietBtn } from './ui';

interface LibraryViewProps {
  /** A source another screen wants opened. */
  focusId: string | null;
  onFocusDone: () => void;
  /** Sends a question to the Ask screen. */
  onAsk: (question: string) => void;
}

type Filter = 'all' | 'project' | 'rules';

const firstSentence = (s: string) => s.split(/(?<=[.!?])\s/)[0] ?? s;
/** Up to two sentences, kept short: enough to carry an idea without pasting a paragraph. */
const gist = (s: string) => {
  const t = s.split(/(?<=[.!?])\s/).slice(0, 2).join(' ');
  return t.length > 170 ? t.slice(0, 167).trimEnd() + '…' : t;
};

const FIELD_LABELS: [keyof NonNullable<Source['fields']>, string][] = [
  ['problem', 'Problem'],
  ['method', 'Method'],
  ['tools', 'Tools'],
  ['findings', 'Findings'],
  ['limitations', 'Limitations'],
  ['future', 'Future work'],
];

function SourceBody({ source }: { source: Source }) {
  if (source.fields) {
    return (
      <dl className="space-y-2 text-sm leading-6">
        {FIELD_LABELS.map(([k, label]) => (
          <div key={k}>
            <dt className="font-mono text-xs uppercase tracking-wider text-muted">{label}</dt>
            <dd className="text-text">{source.fields![k]}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return <p className="whitespace-pre-wrap text-sm leading-6 text-text">{source.text}</p>;
}

export const LibraryView: React.FC<LibraryViewProps> = ({ focusId, onFocusDone, onAsk }) => {
  // Finder
  const [idea, setIdea] = useState('');
  const [found, setFound] = useState<Hit[] | null>(null);

  // Browser
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [version, setVersion] = useState(0); // bumps after add/remove so the list re-reads storage
  const rowRefs = useRef<Record<string, HTMLLIElement | null>>({});

  // Add a source
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<SourceKind>('policy');
  const [meta, setMeta] = useState('');
  const [tags, setTags] = useState('');
  const [text, setText] = useState('');
  const [reading, setReading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!focusId) return;
    setFilter('all');
    setQuery('');
    setOpenId(focusId);
    const t = setTimeout(() => {
      rowRefs.current[focusId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      onFocusDone();
    }, 60);
    return () => clearTimeout(t);
  }, [focusId, onFocusDone]);

  const all = getSources();
  void version;
  const q = query.trim();
  const shown: Source[] = (q ? searchSources(q, { n: 30, min: 1 }).map((h) => h.source) : all).filter((s) =>
    filter === 'all' ? true : filter === 'project' ? s.kind === 'project' : s.kind !== 'project'
  );
  const projectCount = all.filter((s) => s.kind === 'project').length;

  const find = (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea.trim()) return;
    setFound(searchSources(idea, { n: 4, kinds: ['project'] }));
  };

  const top = found?.[0]?.source;
  const supervisorQuestions = top?.fields
    ? [
        `My idea is close to “${top.title}”. What will mine do differently?`,
        `That project used this approach: ${gist(top.fields.method)} Is that right for my problem, or something else?`,
        `It listed this as a limit: ${firstSentence(top.fields.limitations)} Is that a gap I could take on?`,
      ]
    : [];

  const handleFile = async (list: FileList | null) => {
    const f = list?.[0];
    if (!f) return;
    setReading(true);
    setMsg(null);
    try {
      const r = await extractText(f);
      setTitle((t) => t || r.title);
      setText(r.text);
      setMsg({ ok: true, text: `Read “${r.title}”. Check it, then add.${r.truncated ? ' Very long files were shortened.' : ''}` });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'That file could not be read.' });
    }
    setReading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !text.trim()) return;
    addSource({ title, kind, meta, text, tags: tags.split(',') });
    setTitle('');
    setMeta('');
    setTags('');
    setText('');
    setMsg({ ok: true, text: 'Added. Grove can now answer from it.' });
    setVersion((v) => v + 1);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Library"
        subtitle="Your university's own material: past final-year projects, course outlines and policies. Grove answers from this first and shows which source it used."
      />

      <p className="rounded-md bg-raised px-4 py-3 text-sm text-muted">
        <span className="font-medium text-text">Sample records.</span> Everything marked “Demo record” is fictional, written to show how Grove works. A real
        university would load its own, with permission from the authors.
      </p>

      <section className={`${panel} space-y-4`} aria-label="Starting a final-year project">
        <div>
          <h2 className="font-display text-lg text-text">Starting your final-year project?</h2>
          <p className="mt-1 text-sm text-muted">
            Describe your idea in a sentence or two. Grove finds past projects close to it, shows what they left open, and suggests what to ask your
            supervisor while you wait to be allocated one.
          </p>
        </div>
        <form onSubmit={find} className="space-y-3">
          <label htmlFor="idea" className={labelCls}>
            Your project idea
          </label>
          <textarea
            id="idea"
            rows={3}
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="For example: an app that helps market traders see current prices without internet"
            className={`${field} resize-y`}
          />
          <button type="submit" disabled={!idea.trim()} className={primaryBtn}>
            Find related projects
          </button>
        </form>

        {found && found.length === 0 && (
          <div role="status" className="rounded-md bg-bg p-4 text-sm leading-6 text-muted ring-1 ring-line">
            Nothing close to this in the library. That can mean your idea is new, or that the library only holds {projectCount} projects so far. Take the idea
            to your supervisor and ask what earlier work they know of.
          </div>
        )}

        {found && found.length > 0 && (
          <div className="space-y-4 animate-slide-up">
            <ul className="space-y-3">
              {found.map((h) => (
                <li key={h.source.id} className="rounded-md bg-bg p-4 ring-1 ring-line">
                  <p className="font-mono text-xs text-muted">{h.source.meta}</p>
                  <p className="mt-0.5 font-medium text-text">{h.source.title}</p>
                  {h.source.fields && (
                    <>
                      <p className="mt-1 text-sm leading-6 text-text">{firstSentence(h.source.fields.problem)}</p>
                      <p className="mt-2 text-sm leading-6 text-muted">
                        <span className="text-text">Left open: </span>
                        {firstSentence(h.source.fields.limitations)}
                      </p>
                    </>
                  )}
                  <button
                    onClick={() => {
                      setFilter('all');
                      setQuery('');
                      setOpenId(h.source.id);
                      setTimeout(() => rowRefs.current[h.source.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
                    }}
                    className="mt-2 min-h-9 text-sm text-accent hover:underline"
                  >
                    Read the full record
                  </button>
                </li>
              ))}
            </ul>

            {supervisorQuestions.length > 0 && (
              <div>
                <h3 className="font-display text-base text-text">Questions to bring to your supervisor</h3>
                <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-6 text-text marker:text-accent">
                  {supervisorQuestions.map((qn) => (
                    <li key={qn}>{qn}</li>
                  ))}
                </ol>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => onAsk(`My project idea: ${idea.trim()}. Which past projects are closest, and what should I ask my supervisor?`)}
                className={quietBtn}
              >
                Ask Grove about this
              </button>
              <p className="text-xs text-muted">Learn from these projects and cite them. Do not copy from them.</p>
            </div>
          </div>
        )}
      </section>

      <section className={`${panel} space-y-4`} aria-label="Browse the library">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented<Filter>
            label="Filter the library"
            value={filter}
            onChange={setFilter}
            options={[
              { id: 'all', label: 'All' },
              { id: 'project', label: 'Final-year projects' },
              { id: 'rules', label: 'Courses and policies' },
            ]}
          />
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the library"
              aria-label="Search the library"
              className={`${field} pl-9`}
            />
          </div>
        </div>

        {shown.length === 0 ? (
          <p className="py-4 text-sm text-muted" role="status">
            Nothing in the library matches that.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {shown.map((s) => {
              const open = openId === s.id;
              return (
                <li
                  key={s.id}
                  ref={(el) => {
                    rowRefs.current[s.id] = el;
                  }}
                  className="py-3"
                >
                  <button
                    onClick={() => setOpenId(open ? null : s.id)}
                    aria-expanded={open}
                    className="flex min-h-11 w-full flex-wrap items-center justify-between gap-x-3 gap-y-1 text-left"
                  >
                    <span className="min-w-0 flex-1 basis-64">
                      <span className="block font-medium text-text">{s.title}</span>
                      <span className="block font-mono text-xs text-muted">{s.meta}</span>
                    </span>
                    <span className={chip}>{KIND_LABEL[s.kind]}</span>
                  </button>
                  {open && (
                    <div className="mt-3 animate-fade-in space-y-3 rounded-md bg-bg p-4 ring-1 ring-line">
                      <SourceBody source={s} />
                      <div className="flex flex-wrap gap-3">
                        <button onClick={() => onAsk(`Explain "${s.title}" and how it applies to my project.`)} className={quietBtn}>
                          Ask Grove about this
                        </button>
                        {!s.demo && (
                          <button
                            onClick={() => {
                              removeSource(s.id);
                              setOpenId(null);
                              setVersion((v) => v + 1);
                            }}
                            className="inline-flex min-h-10 items-center gap-2 px-2 text-sm text-muted hover:text-text"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className={panel} aria-label="Add to the library">
        <Disclosure summary="Add a source to the library (university staff)">
          <p className="mb-3 max-w-prose text-sm text-muted">
            In a real deployment only staff could add material, and the university would approve what goes in. Here, whatever you add stays in this browser
            and Grove can answer from it straight away.
          </p>
          <form onSubmit={add} className="space-y-3">
            <div
              onClick={() => fileRef.current?.click()}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-3 text-sm text-muted ring-1 ring-dashed ring-line hover:text-text"
            >
              <FileUp className="h-4 w-4" aria-hidden />
              {reading ? 'Reading the file…' : 'Choose a PDF, Word or text file, or paste below'}
              <input ref={fileRef} type="file" accept={ACCEPT} className="sr-only" onChange={(e) => handleFile(e.target.files)} aria-label="Choose a file" />
            </div>
            {msg && (
              <p role="status" className={`text-sm ${msg.ok ? 'text-muted' : 'text-warn'}`}>
                {msg.text}
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="src-title" className={labelCls}>
                  Title
                </label>
                <input id="src-title" value={title} onChange={(e) => setTitle(e.target.value)} className={field} />
              </div>
              <div>
                <label htmlFor="src-kind" className={labelCls}>
                  Type
                </label>
                <select id="src-kind" value={kind} onChange={(e) => setKind(e.target.value as SourceKind)} className={field}>
                  <option value="policy">Policy or regulation</option>
                  <option value="course">Course outline</option>
                  <option value="project">Past final-year project</option>
                </select>
              </div>
              <div>
                <label htmlFor="src-meta" className={labelCls}>
                  Source line (optional)
                </label>
                <input id="src-meta" value={meta} onChange={(e) => setMeta(e.target.value)} placeholder="e.g. Student handbook 2026" className={field} />
              </div>
              <div>
                <label htmlFor="src-tags" className={labelCls}>
                  Tags (optional, comma separated)
                </label>
                <input id="src-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="deadlines, exams" className={field} />
              </div>
            </div>
            <div>
              <label htmlFor="src-text" className={labelCls}>
                Text
              </label>
              <textarea id="src-text" rows={6} value={text} onChange={(e) => setText(e.target.value)} className={`${field} resize-y`} />
            </div>
            <button type="submit" disabled={!title.trim() || !text.trim()} className={primaryBtn}>
              Add to the library
            </button>
          </form>
        </Disclosure>
      </section>
    </div>
  );
};
