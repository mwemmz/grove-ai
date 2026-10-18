import React, { useState, useRef, useEffect } from 'react';
import { Note, LearningProfile, ChatMessage } from '../types';
import { aiService } from '../services/aiService';
import { storage } from '../services/storage';
import { Disclosure, Toast, Inline, field, labelCls, primaryBtn, panel, chip } from './ui';

interface ChatTutorViewProps {
  notes: Note[];
  profile: LearningProfile;
  setProfile: React.Dispatch<React.SetStateAction<LearningProfile>>;
  onOpenNoteDetail?: (note: Note) => void;
}

const STARTER_PROMPTS = [
  'Where did I first learn about mutual exclusion and locks?',
  'Compare B+ Trees with Hash Tables for indexing',
  'Explain Raft log replication in my preferred style',
];
const PLACEHOLDER = 'Where did I learn about pointers, and how does it connect to what we do now?';

const ADAPT_ACTIONS: { id: 'too-long' | 'analogy' | 'code' | 'lost' | 'quiz'; label: string }[] = [
  { id: 'too-long', label: 'Shorter' },
  { id: 'analogy', label: 'Use an analogy' },
  { id: 'code', label: 'Show code' },
  { id: 'lost', label: "I'm lost" },
  { id: 'quiz', label: 'Quiz me' },
];

function MessageBody({ text }: { text: string }) {
  return (
    <div className="space-y-3 text-[15px] leading-7 text-text">
      {text.split('\n\n').map((paragraph, i) => {
        if (paragraph.startsWith('### ')) {
          return (
            <h3 key={i} className="pt-1 text-base font-semibold text-text">
              <Inline text={paragraph.replace('### ', '')} />
            </h3>
          );
        }
        if (paragraph.startsWith('#### ')) {
          return (
            <h4 key={i} className="text-[15px] font-semibold text-text">
              <Inline text={paragraph.replace('#### ', '')} />
            </h4>
          );
        }
        if (paragraph.startsWith('> ')) {
          return (
            <blockquote key={i} className="border-l-2 border-accent/60 pl-3 text-muted">
              <Inline text={paragraph.replace('> ', '')} />
            </blockquote>
          );
        }
        if (paragraph.startsWith('```')) {
          const code = paragraph.split('\n').slice(1, -1).join('\n');
          return (
            <pre key={i} className="overflow-x-auto rounded-lg bg-surface p-4 font-mono text-[13px] leading-6 text-text">
              <code>{code}</code>
            </pre>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap">
            <Inline text={paragraph} />
          </p>
        );
      })}
    </div>
  );
}

export const ChatTutorView: React.FC<ChatTutorViewProps> = ({
  notes,
  profile,
  setProfile,
  onOpenNoteDetail,
}) => {
  // Older saved chats began with a long welcome message; drop it so the screen starts clean.
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    storage.getChatHistory().filter((m) => !m.id.startsWith('welcome'))
  );
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    storage.saveChatHistory(messages);
  }, [messages]);

  const flash = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend ?? input).trim();
    if (!query || isLoading) return;

    const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, sender: 'user', text: query, timestamp: now() }]);
    setInput('');
    setIsLoading(true);

    try {
      await new Promise((r) => setTimeout(r, 400));
      const payload = await aiService.askGrove(query, notes, profile);

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
      messages[messages.length - 1]?.text.slice(0, 40)
    );
    setProfile(updatedProfile);
    flash(feedbackMessage);
    if (action === 'quiz') handleSend('Generate an active-recall conceptual quiz question based on this topic.');
  };

  const clearChat = () => {
    setMessages([]);
    storage.saveChatHistory([]);
  };

  // Only the latest exchange is on screen, like a workbench. Earlier ones stay saved.
  const last = messages[messages.length - 1];
  const answer = last?.sender === 'assistant' ? last : undefined;
  const question = answer ? [...messages].reverse().find((m) => m.sender === 'user') : undefined;
  const connections = answer?.yearConnections ?? [];

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
          Ask anything. Grove answers from your own notes first.
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
            {isLoading ? 'Looking through your notes…' : 'Ask Grove'}
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
          Looking through your notes…
        </p>
      )}
    </section>
  );
};
