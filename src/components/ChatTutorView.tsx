import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  TreePine, 
  BookOpen, 
  Check, 
  ExternalLink,
  Code,
  Zap,
  HelpCircle,
  Compass,
  Lightbulb,
  GraduationCap
} from 'lucide-react';
import { Note, LearningProfile, ChatMessage } from '../types';
import { aiService } from '../services/aiService';
import { storage } from '../services/storage';

interface ChatTutorViewProps {
  notes: Note[];
  profile: LearningProfile;
  setProfile: React.Dispatch<React.SetStateAction<LearningProfile>>;
  onOpenNoteDetail?: (note: Note) => void;
}

const STARTER_PROMPTS = [
  "Where did I first learn about mutual exclusion and locks?",
  "How does my Year 4 Capstone event broker connect to Year 1 memory concepts?",
  "Compare B+ Trees (CS302) with Hash Tables (CS103) for indexing",
  "Explain Raft consensus log replication using my preferred code-first style",
];

export const ChatTutorView: React.FC<ChatTutorViewProps> = ({
  notes,
  profile,
  setProfile,
  onOpenNoteDetail,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = storage.getChatHistory();
    if (saved.length > 0) return saved;

    return [
      {
        id: 'welcome-1',
        sender: 'assistant',
        text: `Welcome back, **${profile.studentName.split(' ')[0]}**! I am **Grove**, your degree-long AI learning companion.

I have indexed your notes from **Year 1 through Year 4** (${notes.length} comprehensive technical notes). 
- When you ask a question, I cross-reference your entire degree history.
- When an advanced Year 3 or 4 concept builds upon a Year 1 or 2 foundation, I will explicitly bridge them.
- I continuously adapt to your preferred style: currently tuned to **${profile.explanationStyle.toUpperCase()}** and **${profile.answerLength.toUpperCase()}** answers.

Try asking about any topic or tap one of the prompts below!`,
        timestamp: 'Just now',
        appliedProfileAttributes: [
          `Style: ${profile.explanationStyle}`,
          `Density: ${profile.answerLength}`,
          `Degree: ${profile.degreeName}`,
        ],
      },
    ];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    storage.saveChatHistory(messages);
  }, [messages]);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Simulate real-time retrieval & response latency
      setTimeout(async () => {
        const responsePayload = await aiService.askGrove(query, notes, profile);

        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          sender: 'assistant',
          text: responsePayload.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citedNotes: responsePayload.citedNotes,
          yearConnections: responsePayload.yearConnections,
          appliedProfileAttributes: responsePayload.appliedProfileAttributes,
        };

        // Increment question count in profile
        setProfile(prev => {
          const updated = {
            ...prev,
            totalQuestionsAsked: prev.totalQuestionsAsked + 1,
          };
          storage.saveProfile(updated);
          return updated;
        });

        setMessages(prev => [...prev, assistantMsg]);
        setIsLoading(false);
      }, 700);
    } catch (err) {
      console.error(err);
      setIsLoading(false);
    }
  };

  const handleFeedback = (action: 'too-long' | 'analogy' | 'code' | 'lost' | 'quiz') => {
    const { updatedProfile, feedbackMessage } = aiService.handleFeedbackPill(
      action,
      profile,
      messages[messages.length - 1]?.text.slice(0, 40)
    );

    setProfile(updatedProfile);
    setFeedbackToast(feedbackMessage);
    setTimeout(() => setFeedbackToast(null), 3500);

    // If quiz requested, automatically prompt
    if (action === 'quiz') {
      handleSend("Generate an active-recall conceptual quiz question based on this topic.");
    }
  };

  const clearChat = () => {
    const initialWelcome: ChatMessage = {
      id: `welcome-${Date.now()}`,
      sender: 'assistant',
      text: `Chat reset. Ask me anything across your 4-year degree curriculum!`,
      timestamp: 'Just now',
    };
    setMessages([initialWelcome]);
    storage.saveChatHistory([initialWelcome]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4.25rem)] max-w-5xl mx-auto w-full px-4 sm:px-6 py-4">
      
      {/* Toast Feedback Notification */}
      {feedbackToast && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 rounded-xl bg-emerald-500/90 text-slate-950 px-4 py-2.5 shadow-2xl font-medium text-sm animate-bounce">
          <Check className="h-4 w-4" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Chat Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.sender === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            {/* Sender Metadata */}
            <div className="flex items-center gap-2 mb-1 px-1">
              {msg.sender === 'assistant' ? (
                <>
                  <div className="h-5 w-5 rounded-md bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                    <TreePine className="h-3 w-3 text-emerald-400" />
                  </div>
                  <span className="text-xs font-semibold text-emerald-400">Grove Degree AI</span>
                  {msg.appliedProfileAttributes && (
                    <div className="hidden sm:flex items-center gap-1.5 ml-2">
                      {msg.appliedProfileAttributes.slice(0, 2).map((attr, idx) => (
                        <span key={idx} className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700/60">
                          {attr}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <span className="text-xs font-medium text-slate-400">You ({profile.studentName.split(' ')[0]})</span>
              )}
              <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
            </div>

            {/* Bubble Body */}
            <div
              className={`rounded-2xl px-5 py-4 max-w-3xl text-sm leading-relaxed animate-slide-up ${
                msg.sender === 'user'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-none shadow-lg shadow-emerald-950/30'
                  : 'bg-slate-900/90 border border-white/[0.08] text-slate-200 rounded-tl-none shadow-xl'
              }`}
            >
              {/* Formatted markdown text */}
              <div className="space-y-3 whitespace-pre-wrap">
                {msg.text.split('\n\n').map((paragraph, i) => {
                  if (paragraph.startsWith('### ')) {
                    return <h3 key={i} className="text-base font-bold text-emerald-300 mt-2">{paragraph.replace('### ', '')}</h3>;
                  }
                  if (paragraph.startsWith('#### ')) {
                    return <h4 key={i} className="text-sm font-semibold text-slate-200 mt-2">{paragraph.replace('#### ', '')}</h4>;
                  }
                  if (paragraph.startsWith('> ')) {
                    return (
                      <blockquote key={i} className="border-l-2 border-emerald-500 pl-3 italic text-emerald-300/90 my-2 bg-emerald-950/20 py-1.5 rounded-r">
                        {paragraph.replace('> ', '')}
                      </blockquote>
                    );
                  }
                  if (paragraph.startsWith('```')) {
                    const lines = paragraph.split('\n');
                    const code = lines.slice(1, -1).join('\n');
                    return (
                      <pre key={i} className="rounded-xl bg-slate-950 p-3.5 border border-slate-800 font-mono text-xs overflow-x-auto text-emerald-300 my-2">
                        <code>{code}</code>
                      </pre>
                    );
                  }
                  return <p key={i} className="text-slate-200">{paragraph}</p>;
                })}
              </div>

              {/* Cross-Year Connections Callout */}
              {msg.yearConnections && msg.yearConnections.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-800/80">
                  <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-teal-400">
                    <TreePine className="h-4 w-4" />
                    <span>Degree-Long Memory Connection</span>
                  </div>
                  {msg.yearConnections.map((conn, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl bg-gradient-to-r from-teal-950/40 to-slate-900/80 border border-teal-500/20 p-3 text-xs text-slate-300 space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-teal-500/20 px-1.5 py-0.5 text-[10px] font-bold text-teal-300 border border-teal-500/30">
                          Year {conn.earlierYear} · {conn.earlierCourse}
                        </span>
                        <span className="font-semibold text-slate-200">{conn.earlierTopic}</span>
                      </div>
                      <p className="text-slate-400 leading-normal">{conn.connectionText}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Cited Notes Pill List */}
              {msg.citedNotes && msg.citedNotes.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-800/80">
                  <div className="flex items-center gap-2 mb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                    <span>Citations from your course notes ({msg.citedNotes.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {msg.citedNotes.map((citation) => {
                      const fullNote = notes.find(n => n.id === citation.noteId);
                      return (
                        <button
                          key={citation.noteId}
                          onClick={() => fullNote && onOpenNoteDetail && onOpenNoteDetail(fullNote)}
                          className="flex items-center gap-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700/80 px-2.5 py-1 text-xs text-slate-300 border border-slate-700/60 transition group"
                        >
                          <span className="rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-1 py-0.2">
                            Y{citation.year} · {citation.courseCode}
                          </span>
                          <span className="truncate max-w-[180px] text-slate-200 group-hover:text-emerald-300">
                            {citation.title}
                          </span>
                          <ExternalLink className="h-3 w-3 text-slate-500 group-hover:text-slate-300" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Vetted Senior Clearance Advice */}
              {msg.seniorTips && msg.seniorTips.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-800/80">
                  <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-amber-400">
                    <GraduationCap className="h-4 w-4" />
                    <span>Battle-Tested Advice from Course Clearance Alumni</span>
                  </div>
                  <div className="space-y-2">
                    {msg.seniorTips.map((tip, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl bg-amber-950/20 border border-amber-500/20 p-3 text-xs text-slate-300 space-y-1"
                      >
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold px-1.5 py-0.5 border border-amber-500/30">
                            {tip.courseCode} · Cleared with {tip.authorGrade}
                          </span>
                          <span className="font-semibold text-slate-200">{tip.authorName}</span>
                        </div>
                        <p className="text-slate-300 leading-normal italic">{tip.tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dynamic Feedback Adaptation Pills (only on assistant messages) */}
              {msg.sender === 'assistant' && msg.id !== 'welcome-1' && (
                <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 mr-1 font-medium">Adapt tutor:</span>
                  
                  <button
                    onClick={() => handleFeedback('too-long')}
                    className="flex items-center gap-1 rounded-md bg-slate-800 hover:bg-slate-700 px-2 py-0.8 text-[11px] text-slate-300 border border-slate-700/60 transition"
                    title="Change profile to concise bullet points"
                  >
                    <Zap className="h-3 w-3 text-amber-400" />
                    <span>Too long</span>
                  </button>

                  <button
                    onClick={() => handleFeedback('analogy')}
                    className="flex items-center gap-1 rounded-md bg-slate-800 hover:bg-slate-700 px-2 py-0.8 text-[11px] text-slate-300 border border-slate-700/60 transition"
                    title="Switch explanation style to intuitive analogies"
                  >
                    <Lightbulb className="h-3 w-3 text-yellow-400" />
                    <span>Analogy</span>
                  </button>

                  <button
                    onClick={() => handleFeedback('code')}
                    className="flex items-center gap-1 rounded-md bg-slate-800 hover:bg-slate-700 px-2 py-0.8 text-[11px] text-slate-300 border border-slate-700/60 transition"
                    title="Switch explanation style to code-first implementation"
                  >
                    <Code className="h-3 w-3 text-blue-400" />
                    <span>Code example</span>
                  </button>

                  <button
                    onClick={() => handleFeedback('lost')}
                    className="flex items-center gap-1 rounded-md bg-slate-800 hover:bg-slate-700 px-2 py-0.8 text-[11px] text-slate-300 border border-slate-700/60 transition"
                    title="Log to 'How I Learn' and flag for step-by-step guidance"
                  >
                    <Compass className="h-3 w-3 text-rose-400" />
                    <span>I'm lost</span>
                  </button>

                  <button
                    onClick={() => handleFeedback('quiz')}
                    className="flex items-center gap-1 rounded-md bg-slate-800 hover:bg-slate-700 px-2 py-0.8 text-[11px] text-slate-300 border border-slate-700/60 transition"
                    title="Generate an active-recall quiz question"
                  >
                    <HelpCircle className="h-3 w-3 text-purple-400" />
                    <span>Quiz me</span>
                  </button>
                </div>
              )}

            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-3 text-slate-400 text-sm py-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 border border-emerald-500/40">
              <TreePine className="h-4 w-4 text-emerald-400 ring-pulse-slow" />
            </div>
            <span>Searching 4-year degree memory & synthesizing connections...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Starter Questions (when few messages) */}
      {messages.length <= 2 && (
        <div className="my-3">
          <p className="text-xs text-slate-400 mb-2 font-medium">Try asking Grove across your 4-year degree:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {STARTER_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSend(prompt)}
                className="text-left rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 p-2.5 text-xs text-slate-300 hover:text-emerald-300 hover:border-emerald-500/40 transition flex items-center justify-between"
              >
                <span>{prompt}</span>
                <Sparkles className="h-3 w-3 text-emerald-400 opacity-60 ml-2 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="mt-3 relative">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 rounded-2xl bg-slate-900/90 border border-slate-800 p-2 shadow-2xl focus-within:border-emerald-500/60 transition"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask Grove (degree-long memory across ${notes.length} notes)...`}
            className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />

          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white shadow-md transition"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>

        <div className="flex items-center justify-between px-2 mt-1.5 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <TreePine className="h-3 w-3 text-emerald-500" />
            Active Degree Knowledge Base: Years 1 - 4
          </span>
          <button
            onClick={clearChat}
            className="hover:text-slate-400 transition"
          >
            Clear conversation
          </button>
        </div>
      </div>

    </div>
  );
};
