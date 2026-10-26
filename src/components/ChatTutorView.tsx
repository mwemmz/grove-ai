import { lazyWithReload } from '../lib/lazyReload';
import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Note, LearningProfile, ChatMessage } from '../types';
import { aiService } from '../services/aiService';
import { storage } from '../services/storage';
import { KIND_LABEL } from '../services/knowledge';
import { picturesFor } from '../data/pictureMatch';
import type { TopicId } from '../data/visualTopics';

const VisualCard = lazyWithReload(() => import('./VisualCard'));
import { Disclosure, Toast, Inline, field, labelCls, primaryBtn, panel, chip } from './ui';

/** Shown in `viewId` when the student pressed "New question": an empty composer, history untouched. */
export const NEW_VIEW = '__new__';

interface ChatTutorViewProps {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  /** Which answer is on screen: null means the latest one. */
  viewId: string | null;
  setViewId: (id: string | null) => void;
  notes: Note[];
  profile: LearningProfile;
  setProfile: React.Dispatch<React.SetStateAction<LearningProfile>>;
  onOpenNoteDetail?: (note: Note) => void;
  /** Opens a university source in the Library. */
  onOpenSource?: (id: string) => void;
  /** A question sent from another screen (for example the Library). Asked once, then cleared. */
  pendingAsk?: string | null;
  onPendingHandled?: () => void;
  /** Opens a picture in the Visuals tab. */
  onOpenVisual?: (id: TopicId) => void;
}

const STARTER_PROMPTS = [
  'What should a final-year project proposal include?',
  'My supervisor has not been allocated yet. What should I do meanwhile?',
  'Has anyone done a project on mobile money fraud?',
  'Where did I first learn about mutual exclusion and locks?',
];
const PLACEHOLDER = 'What should my project proposal include, and has anyone done something like my idea?';

const ADAPT_ACTIONS: { id: 'too-long' | 'analogy' | 'code' | 'lost' | 'quiz'; label: string }[] = [
  { id: 'too-long', label: 'Shorter' },
  { id: 'analogy', label: 'Use an analogy' },
  { id: 'code', label: 'Show code' },
  { id: 'lost', label: "I'm lost" },
  { id: 'quiz', label: 'Quiz me' },
];

/** Renders the answer: headings, numbered or bulleted lists, quotes, and fenced code (blank lines inside code are kept). */
function MessageBody({ text }: { text: string }) {
  const parts = text.split(/(```[\s\S]*?```)/g).filter((p) => p.trim());
  const out: React.ReactNode[] = [];
  parts.forEach((part, pi) => {
    if (part.startsWith('```')) {
      const code = part.replace(/^```[^\n]*\n?/, '').replace(/```\s*$/, '').replace(/\n$/, '');
      out.push(
        <pre key={`c${pi}`} className="overflow-x-auto rounded-lg bg-bg p-4 font-mono text-[13px] leading-6 text-text ring-1 ring-line">
          <code>{code}</code>
        </pre>
      );
      return;
    }
    part.split(/\n{2,}/).forEach((chunk, ci) => {
      const lines = chunk.split('\n').filter((l) => l.trim());
      let i = 0;
      while (i < lines.length) {
        const line = lines[i];
        const key = `p${pi}-${ci}-${i}`;
        if (/^#{3,4}\s/.test(line)) {
          out.push(
            <h3 key={key} className="pt-1 font-display text-lg text-text">
              <Inline text={line.replace(/^#{3,4}\s*/, '')} />
            </h3>
          );
          i++;
        } else if (/^\d+\.\s/.test(line) || /^[-*]\s/.test(line)) {
          const ordered = /^\d+\./.test(line);
          const items: string[] = [];
          while (i < lines.length && (ordered ? /^\d+\.\s/.test(lines[i]) : /^[-*]\s/.test(lines[i]))) {
            items.push(lines[i].replace(/^(\d+\.|[-*])\s+/, ''));
            i++;
          }
          const List = ordered ? 'ol' : 'ul';
          out.push(
            <List key={key} className={`space-y-1.5 pl-5 ${ordered ? 'list-decimal' : 'list-disc'} marker:text-accent`}>
              {items.map((it, k) => (
                <li key={k}><Inline text={it} /></li>
              ))}
            </List>
          );
        } else if (line.startsWith('> ')) {
          out.push(
            <blockquote key={key} className="border-l-2 border-accent/60 pl-3 text-muted">
              <Inline text={line.replace(/^>\s*/, '')} />
            </blockquote>
          );
          i++;
        } else {
          const para: string[] = [];
          while (i < lines.length && !/^#{3,4}\s|^\d+\.\s|^[-*]\s|^>\s/.test(lines[i])) {
            para.push(lines[i]);
            i++;
          }
          out.push(
            <p key={key} className="whitespace-pre-wrap">
              <Inline text={para.join('\n')} />
            </p>
          );
        }
      }
    });
  });
  return <div className="space-y-3 text-[15px] leading-7 text-text">{out}</div>;
}

export const ChatTutorView: React.FC<ChatTutorViewProps> = ({
  messages,
  setMessages,
  viewId,
  setViewId,
  notes,
  profile,
  setProfile,
  onOpenNoteDetail,
  onOpenSource,
  onOpenVisual,
  pendingAsk,
  onPendingHandled,
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSend = async (textToSend?: string, task: 'ask' | 'quiz' = 'ask') => {
    const query = (textToSend ?? input).trim();
    if (!query || isLoading) return;

    const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, sender: 'user', text: query, timestamp: now() }]);
    setInput('');
    setViewId(null);
    setIsLoading(true);

    try {
      await new Promise((r) => setTimeout(r, 400));
      const previous = answer && question ? { question: question.text, answer: answer.text } : undefined;
      const payload = await aiService.askGrove(query, notes, profile, { previous, task });

      setProfile((prev) => {
        const updated = { ...prev, totalQuestionsAsked: prev.totalQuestionsAsked + 1 };
        storage.saveProfile(updated);
        return updated;
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          sender: 'assistant',
          text: payload.text,
          timestamp: now(),
          sources: payload.sources,
          citedNotes: payload.citedNotes,
          yearConnections: payload.yearConnections,
          seniorTips: payload.seniorTips,
          appliedProfileAttributes: payload.appliedProfileAttributes,
        },
      ]);
    } catch (err) {
      console.error(err);
      flash('Something went wrong. Try asking again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = (action: (typeof ADAPT_ACTIONS)[number]['id']) => {
    const { updatedProfile, feedbackMessage } = aiService.handleFeedbackPill(
      action,
      profile,
      answer?.text.slice(0, 40)
    );
    setProfile(updatedProfile);
    flash(feedbackMessage);
    if (action === 'quiz') handleSend(question ? `Quiz me with one short question on: ${question.text}` : 'Generate an active-recall conceptual quiz question based on this topic.', 'quiz');
  };

  useEffect(() => {
    if (pendingAsk && !isLoading) {
      onPendingHandled?.();
      handleSend(pendingAsk);
    }
    // handleSend closes over current state; it only needs to run when a new question arrives
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAsk]);

  const clearChat = () => {
    setMessages([]);
    setViewId(null);
  };

  // Only the latest exchange is on screen, like a workbench. Earlier ones stay saved.
  const shownIndex =
    viewId === NEW_VIEW
      ? -1
      : viewId
        ? messages.findIndex((m) => m.id === viewId)
        : messages.length - 1;
  const shown = shownIndex >= 0 ? messages[shownIndex] : undefined;
  const answer = shown?.sender === 'assistant' ? shown : undefined;
  const question = answer
    ? [...messages.slice(0, shownIndex)].reverse().find((m) => m.sender === 'user')
    : undefined;
  const connections = answer?.yearConnections ?? [];
  // Dual coding: if the question is about an idea Grove has a picture for, show the picture beside the words.
  const picture = answer ? picturesFor(`${question?.text ?? ''} ${question?.text ?? ''} ${answer.text}`, 1)[0] : undefined;

  return (
    <section className={`${panel} space-y-4`} aria-label="Ask Grove">
      <Toast message={toast} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="space-y-3"
      >
        <label htmlFor="ask" className={labelCls}>
          Ask anything. Grove answers from your university's library and your own notes, and says when it can't find it.
        </label>
        <textarea
          id="ask"
          rows={3}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend();
          }}
          placeholder={PLACEHOLDER}
          className={`${field} min-h-[84px] resize-y`}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={!input.trim() || isLoading} className={primaryBtn}>
            {isLoading ? 'Looking through the library…' : 'Ask Grove'}
          </button>
          {messages.length > 0 && !isLoading && (
            <button type="button" onClick={clearChat} className="min-h-10 px-1 text-sm text-muted hover:text-text">
              Clear
            </button>
          )}
        </div>
      </form>

      {!answer && !isLoading && (
        <div className="flex flex-wrap gap-2" aria-label="Suggestions">
          {STARTER_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSend(prompt)}
              className="min-h-9 rounded-full bg-raised px-3.5 py-1 text-left text-sm text-text hover:brightness-125"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {answer && !isLoading && (
        <div className="space-y-4 border-t border-line pt-4 animate-slide-up">
          {question && <p className="text-sm text-muted">You asked: {question.text}</p>}
          <MessageBody text={answer.text} />

          {picture && (
            <Suspense fallback={<p className="text-sm text-muted" role="status">Loading the picture…</p>}>
              <div className="max-w-2xl">
                <VisualCard key={picture} topicId={picture} onOpen={onOpenVisual} />
              </div>
            </Suspense>
          )}
          {(() => {
            const tag = answer.appliedProfileAttributes?.find((a) => a.startsWith('Answered by') || a.startsWith('AI engine unavailable'));
            if (!tag) return null;
            const failed = tag.startsWith('AI engine unavailable');
            return (
              <p role="status" className={`text-xs ${failed ? 'text-warn' : 'text-muted'}`}>
                {tag}
              </p>
            );
          })()}

          {answer.sources && answer.sources.length > 0 && (
            <div className="space-y-2" aria-label="From the university library">
              <p className="font-mono text-xs uppercase tracking-wider text-muted">From the university library</p>
              <div className="flex flex-wrap gap-2">
                {answer.sources.map((src) => (
                  <button
                    key={src.id}
                    onClick={() => onOpenSource?.(src.id)}
                    title={src.demo ? 'Sample record: fictional demo data' : src.meta}
                    className={`${chip} hover:brightness-125`}
                  >
                    {KIND_LABEL[src.kind]} · {src.title}
                    {src.demo && <span className="text-muted">· sample</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {answer.citedNotes && answer.citedNotes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {answer.citedNotes.map((c) => {
                const full = notes.find((n) => n.id === c.noteId);
                return (
                  <button key={c.noteId} onClick={() => full && onOpenNoteDetail?.(full)} className={`${chip} hover:brightness-125`}>
                    Y{c.year} · {c.courseCode} · {c.title}
                  </button>
                );
              })}
            </div>
          )}

          {connections.length > 0 && (
            <div className="rounded-md bg-bg p-4 ring-1 ring-line">
              <p className="font-mono text-xs uppercase tracking-wider text-accent">
                Builds on year {connections[0].earlierYear} · {connections[0].earlierCourse}
              </p>
              <p className="mt-1 font-medium text-text">{connections[0].earlierTopic}</p>
              <p className="mt-1 text-sm leading-6 text-muted">{connections[0].connectionText}</p>
              {connections.length > 1 && (
                <div className="mt-2">
                  <Disclosure summary={`${connections.length - 1} more ${connections.length === 2 ? 'connection' : 'connections'}`}>
                    <div className="space-y-3">
                      {connections.slice(1).map((c, i) => (
                        <div key={i}>
                          <p className="font-mono text-xs text-muted">Year {c.earlierYear} · {c.earlierCourse}</p>
                          <p className="font-medium text-text">{c.earlierTopic}</p>
                          <p className="text-sm leading-6 text-muted">{c.connectionText}</p>
                        </div>
                      ))}
                    </div>
                  </Disclosure>
                </div>
              )}
            </div>
          )}

          {answer.seniorTips && answer.seniorTips.length > 0 && (
            <Disclosure summary={`Tips from seniors (${answer.seniorTips.length})`}>
              <div className="space-y-3">
                {answer.seniorTips.map((tip, i) => (
                  <div key={i} className="rounded-md bg-bg p-4 ring-1 ring-line">
                    <p className="font-mono text-xs text-muted">
                      {tip.authorName} · {tip.courseCode}, cleared with {tip.authorGrade}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-text">{tip.tip}</p>
                  </div>
                ))}
              </div>
            </Disclosure>
          )}

          <div className="flex flex-wrap gap-1.5" aria-label="Adjust how Grove answers">
            {ADAPT_ACTIONS.map((a) => (
              <button
                key={a.id}
                onClick={() => handleFeedback(a.id)}
                className="min-h-8 rounded-md px-2.5 text-[13px] text-text ring-1 ring-line hover:bg-raised"
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {isLoading && (
        <p className="flex items-center gap-2 text-sm text-muted" role="status">
          <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
          Looking through the library and your notes…
        </p>
      )}
    </section>
  );
};
