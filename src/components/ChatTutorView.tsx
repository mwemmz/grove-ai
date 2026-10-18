import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { Note, LearningProfile, ChatMessage } from '../types';
import { aiService } from '../services/aiService';
import { storage } from '../services/storage';
import { Disclosure, Toast, Inline, field } from './ui';

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
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    storage.saveChatHistory(messages);
  }, [messages]);

  // A new answer scrolls to its first line so you read from the top; everything else follows the bottom.
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.sender === 'assistant' && !isLoading) {
      document.getElementById(last.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend ?? input).trim();
    if (!query || isLoading) return;

    const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, sender: 'user', text: query, timestamp: now() }]);
    setInput('');
    setIsLoading(true);

    try {
      await new Promise((r) => setTimeout(r, 500));
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
      setToast('Something went wrong. Try asking again.');
      setTimeout(() => setToast(null), 3000);
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
    setToast(feedbackMessage);
    setTimeout(() => setToast(null), 3000);
    if (action === 'quiz') handleSend('Generate an active-recall conceptual quiz question based on this topic.');
  };

  const clearChat = () => {
    setMessages([]);
    storage.saveChatHistory([]);
  };

  const lastAssistantId = [...messages].reverse().find((m) => m.sender === 'assistant')?.id;
  const firstName = profile.studentName.split(' ')[0];

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-4 sm:px-6">
      <Toast message={toast} />

      <div className="flex-1 overflow-y-auto overscroll-contain py-6">
        {messages.length === 0 && !isLoading ? (
          <div className="flex min-h-full flex-col justify-center gap-8 pb-8">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-text">Hi {firstName}.</h1>
              <p className="mt-2 max-w-md text-muted">
                Ask about anything from your degree. Grove answers from your own notes and shows where each answer comes from.
              </p>
            </div>
            <div className="flex flex-col items-start gap-2">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  className="min-h-11 rounded-xl bg-surface px-4 py-2 text-left text-sm text-text ring-1 ring-line transition-colors hover:bg-raised"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {messages.map((msg) => {
              if (msg.sender === 'user') {
                return (
                  <div key={msg.id} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl bg-raised px-4 py-2.5 text-[15px] leading-7 text-text animate-slide-up">
                      {msg.text}
                    </div>
                  </div>
                );
              }

              const connections = msg.yearConnections ?? [];
              const isLast = msg.id === lastAssistantId;
              return (
                <div key={msg.id} id={msg.id} className="scroll-mt-2 space-y-4 animate-slide-up">
                  <MessageBody text={msg.text} />

                  {connections.length > 0 && (
                    <div className="rounded-xl bg-surface p-4">
                      <p className="text-sm text-muted">
                        Builds on Year {connections[0].earlierYear} · {connections[0].earlierCourse}
                      </p>
                      <p className="mt-1 font-medium text-text">{connections[0].earlierTopic}</p>
                      <p className="mt-1 text-sm leading-6 text-muted">{connections[0].connectionText}</p>
                      {connections.length > 1 && (
                        <div className="mt-2">
                          <Disclosure summary={`${connections.length - 1} more ${connections.length === 2 ? 'connection' : 'connections'}`}>
                            <div className="space-y-3">
                              {connections.slice(1).map((c, i) => (
                                <div key={i}>
                                  <p className="text-sm text-muted">Year {c.earlierYear} · {c.earlierCourse}</p>
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

                  {msg.citedNotes && msg.citedNotes.length > 0 && (
                    <Disclosure summary={`From your notes (${msg.citedNotes.length})`}>
                      <div className="flex flex-wrap gap-2">
                        {msg.citedNotes.map((c) => {
                          const full = notes.find((n) => n.id === c.noteId);
                          return (
                            <button
                              key={c.noteId}
                              onClick={() => full && onOpenNoteDetail?.(full)}
                              className="min-h-9 max-w-full rounded-lg bg-surface px-3 text-left text-sm text-text ring-1 ring-line hover:bg-raised"
                            >
                              <span className="text-muted">Y{c.year} · {c.courseCode} · </span>
                              <span className="truncate">{c.title}</span>
                            </button>
                          );
                        })}
                      </div>
                    </Disclosure>
                  )}

                  {msg.seniorTips && msg.seniorTips.length > 0 && (
                    <Disclosure summary={`Tips from seniors (${msg.seniorTips.length})`}>
                      <div className="space-y-3">
                        {msg.seniorTips.map((tip, i) => (
                          <div key={i} className="rounded-xl bg-surface p-4">
                            <p className="text-sm text-muted">
                              {tip.authorName} · {tip.courseCode}, cleared with {tip.authorGrade}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-text">{tip.tip}</p>
                          </div>
                        ))}
                      </div>
                    </Disclosure>
                  )}

                  {isLast && !isLoading && (
                    <div className="flex flex-wrap gap-2 pt-1" aria-label="Adjust how Grove answers">
                      {ADAPT_ACTIONS.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => handleFeedback(a.id)}
                          className="min-h-9 rounded-lg px-3 text-sm text-muted ring-1 ring-line transition-colors hover:bg-surface hover:text-text"
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <p className="flex items-center gap-2 text-sm text-muted" role="status">
                <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
                Looking through your notes…
              </p>
            )}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="pb-4 pt-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about anything in your degree"
            aria-label="Ask Grove"
            className={`${field} h-12 flex-1 rounded-xl bg-surface px-4`}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            aria-label="Send"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-strong text-white transition-colors hover:bg-accent hover:text-bg disabled:opacity-40"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        </form>
        {messages.length > 0 && (
          <div className="mt-1 flex justify-end">
            <button onClick={clearChat} className="min-h-9 px-1 text-sm text-muted hover:text-text">
              Clear conversation
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
