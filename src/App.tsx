import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useAuth, SignInButton } from '@clerk/react';
import { TreePine } from 'lucide-react';
import { AppTab, TAB_LABEL } from './components/Header';
import { Shell } from './components/Shell';
import { Sidebar } from './components/Sidebar';
import { ProgressPanel } from './components/ProgressPanel';
import { ChatTutorView, NEW_VIEW } from './components/ChatTutorView';
import { DegreeMemoryView } from './components/DegreeMemoryView';
import { StudyBlueprintsView } from './components/StudyBlueprintsView';
import { PeerTutoringView } from './components/PeerTutoringView';
import { LearningProfileView } from './components/LearningProfileView';
import { PortfolioView } from './components/PortfolioView';
import { QuizView } from './components/QuizView';
import { StudyView, StudyPreset } from './components/StudyView';
import { PlannerView } from './components/PlannerView';
import { LibraryView } from './components/LibraryView';
const VisualsView = lazy(() => import('./components/VisualsView').then((m) => ({ default: m.VisualsView })));
import { SettingsModal } from './components/SettingsModal';
import {
  Note,
  Course,
  LearningProfile,
  ChatMessage,
  Flashcard,
  PortfolioSkill,
  PortfolioProject,
  SeniorComment,
  StudyBlueprint,
  TutorProfile,
  TutorRequest,
} from './types';
import { storage } from './services/storage';
import type { TopicId } from './data/visualTopics';
import { aiService } from './services/aiService';
import { setTokenProvider } from './lib/api';

function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="min-h-dvh bg-bg text-text flex flex-col items-center justify-center gap-4 font-sans">
      <TreePine className="h-9 w-9 text-accent animate-pulse" />
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}

function SignInScreen() {
  return (
    <div className="min-h-dvh bg-bg text-text flex items-center justify-center px-4 font-sans">
      <div className="w-full max-w-sm text-center">
        <TreePine className="h-9 w-9 text-accent mx-auto mb-5" />
        <h1 className="font-display text-4xl tracking-tight mb-2">Grove</h1>
        <p className="text-muted mb-8">
          A study companion that remembers your whole degree.
        </p>
        <SignInButton mode="modal">
          <button className="w-full min-h-11 rounded-md bg-accent text-ink font-semibold hover:brightness-110 transition-[filter]">
            Sign in
          </button>
        </SignInButton>
      </div>
    </div>
  );
}

function AuthGate() {
  const { isLoaded, isSignedIn, getToken } = useAuth();

  useEffect(() => {
    if (isLoaded) {
      setTokenProvider(getToken);
    }
  }, [isLoaded, getToken]);

  if (!isLoaded) {
    return <LoadingScreen label="Starting Grove..." />;
  }
  if (!isSignedIn) {
    return <SignInScreen />;
  }
  return <GroveApp />;
}

function GroveApp() {
  const [activeTab, setActiveTab] = useState<AppTab>('remember');
  const [isDataReady, setIsDataReady] = useState(false);

  const [notes, setNotes] = useState<Note[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [profile, setProfile] = useState<LearningProfile>(() => storage.getProfile());
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [skills, setSkills] = useState<PortfolioSkill[]>([]);
  const [projects, setProjects] = useState<PortfolioProject[]>([]);

  // Cohort & Peer Mentorship State
  const [seniorComments, setSeniorComments] = useState<SeniorComment[]>([]);
  const [blueprints, setBlueprints] = useState<StudyBlueprint[]>([]);
  const [tutors, setTutors] = useState<TutorProfile[]>([]);
  const [tutorRequests, setTutorRequests] = useState<TutorRequest[]>([]);

  const [selectedNoteForDetail, setSelectedNoteForDetail] = useState<Note | null>(null);
  const [visualFocus, setVisualFocus] = useState<TopicId | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [studyPreset, setStudyPreset] = useState<StudyPreset | null>(null);

  // Conversation history lives here so the sidebar, the progress panel and the Ask box all agree.
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [chatView, setChatView] = useState<string | null>(null);
  const seededChat = useRef(false);
  // Library <-> Ask hand-offs: open a source in the Library, or send a question to the Ask screen.
  const [focusSourceId, setFocusSourceId] = useState<string | null>(null);
  const [pendingAsk, setPendingAsk] = useState<string | null>(null);

  // Skips the auto-save effects for the initial post-hydration commit.
  const skipInitialSync = useRef(true);

  useEffect(() => {
    let cancelled = false;
    storage.hydrate().then(() => {
      if (cancelled) return;
      setNotes(storage.getNotes());
      setCourses(storage.getCourses());
      setProfile(storage.getProfile());
      setFlashcards(storage.getFlashcards());
      setSkills(storage.getSkills());
      setProjects(storage.getProjects());
      setSeniorComments(storage.getSeniorComments());
      setBlueprints(storage.getBlueprints());
      setTutors(storage.getTutors());
      setTutorRequests(storage.getTutorRequests());
      // Older saved chats began with a long welcome message; drop it.
      setChat(storage.getChatHistory().filter((m) => !m.id.startsWith('welcome')));
      setIsDataReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Sync to storage on state changes (each save also PUTs to the API)
  useEffect(() => {
    if (skipInitialSync.current) return;
    storage.saveNotes(notes);
  }, [notes]);

  useEffect(() => {
    if (skipInitialSync.current) return;
    storage.saveCourses(courses);
  }, [courses]);

  useEffect(() => {
    if (skipInitialSync.current) return;
    storage.saveProfile(profile);
  }, [profile]);

  useEffect(() => {
    if (skipInitialSync.current) return;
    storage.saveFlashcards(flashcards);
  }, [flashcards]);

  useEffect(() => {
    if (skipInitialSync.current) return;
    storage.saveChatHistory(chat);
  }, [chat]);

  useEffect(() => {
    if (skipInitialSync.current) return;
    storage.saveSeniorComments(seniorComments);
  }, [seniorComments]);

  useEffect(() => {
    if (skipInitialSync.current) return;
    storage.saveBlueprints(blueprints);
  }, [blueprints]);

  useEffect(() => {
    if (skipInitialSync.current) return;
    storage.saveTutors(tutors);
  }, [tutors]);

  useEffect(() => {
    if (skipInitialSync.current) return;
    storage.saveTutorRequests(tutorRequests);
  }, [tutorRequests]);

  // Declared after the auto-save effects so it flips the flag only once
  // the hydration commit's effects have already run (and been skipped).
  useEffect(() => {
    if (isDataReady) {
      skipInitialSync.current = false;
    }
  }, [isDataReady]);

  // A brand-new account starts with a few example questions so the history is not empty.
  useEffect(() => {
    if (!isDataReady || seededChat.current) return;
    seededChat.current = true;
    if (chat.length > 0 || notes.length === 0) return;
    (async () => {
      const starters = [
        'What should a final-year project proposal include?',
        'Has anyone done a project on mobile money fraud?',
        'Where did I first learn about mutual exclusion and locks?',
      ];
      const seeded: ChatMessage[] = [];
      for (const [i, q] of starters.entries()) {
        const payload = await aiService.askGrove(q, notes, profile, { live: false });
        const stamp = new Date(Date.now() - (starters.length - i) * 3600_000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        seeded.push(
          { id: `user-seed-${i}`, sender: 'user', text: q, timestamp: stamp },
          {
            id: `assistant-seed-${i}`,
            sender: 'assistant',
            text: payload.text,
            timestamp: stamp,
            sources: payload.sources,
            citedNotes: payload.citedNotes,
            yearConnections: payload.yearConnections,
            seniorTips: payload.seniorTips,
            appliedProfileAttributes: payload.appliedProfileAttributes,
          }
        );
      }
      setChat(seeded);
      setChatView(NEW_VIEW);
    })();
  }, [isDataReady, chat.length, notes, profile]);

  const handleResetDemo = async () => {
    await storage.resetAllToDemo();
    setNotes(storage.getNotes());
    setCourses(storage.getCourses());
    setProfile(storage.getProfile());
    setFlashcards(storage.getFlashcards());
    setSkills(storage.getSkills());
    setProjects(storage.getProjects());
    setSeniorComments(storage.getSeniorComments());
    setBlueprints(storage.getBlueprints());
    setTutors(storage.getTutors());
    setTutorRequests(storage.getTutorRequests());
  };

  const handleOpenNoteDetail = (note: Note) => {
    setSelectedNoteForDetail(note);
    setActiveTab('remember');
  };

  const openVisual = (id: TopicId) => {
    setVisualFocus(id);
    setActiveTab('visuals');
  };

  const addCourse = (course: Course) => {
    setCourses((prev) => {
      if (prev.some((c) => c.code === course.code)) return prev;
      const next = [...prev, course];
      storage.saveCourses(next);
      return next;
    });
  };

  const handleStartSession = (preset: StudyPreset) => {
    setStudyPreset(preset);
    setActiveTab('study');
  };

  const handleLaunchTopicQuiz = (_topic: string) => {
    setActiveTab('quiz');
  };

  if (!isDataReady) {
    return <LoadingScreen label="Loading your degree memory..." />;
  }

  const handleYearChange = (year: number) =>
    setProfile((prev) => ({ ...prev, currentYear: year as LearningProfile['currentYear'] }));

  const goTo = (tab: AppTab) => {
    setStudyPreset(null);
    setActiveTab(tab);
  };

  const openNoteById = (id: string) => {
    const note = notes.find((n) => n.id === id);
    if (note) handleOpenNoteDetail(note);
  };

  // Each answered question becomes one line in the sidebar, newest first.
  const recents = chat
    .map((m, i) => ({ m, i }))
    .filter(({ m, i }) => m.sender === 'assistant' && chat[i - 1]?.sender === 'user')
    .map(({ m, i }) => ({ id: m.id, text: chat[i - 1].text }))
    .reverse()
    .slice(0, 8);

  const shownAnswer =
    chatView === NEW_VIEW
      ? undefined
      : chatView
        ? chat.find((m) => m.id === chatView)
        : chat[chat.length - 1]?.sender === 'assistant'
          ? chat[chat.length - 1]
          : undefined;
  const sources = (shownAnswer?.citedNotes ?? []).map((c) => ({
    noteId: c.noteId,
    courseCode: c.courseCode,
    year: c.year,
    title: c.title,
  }));

  return (
    <>
      <Shell
        title={TAB_LABEL[activeTab]}
        sidebar={(api) => (
          <Sidebar
            tab={activeTab}
            onTab={goTo}
            recents={recents}
            activeRecentId={activeTab === 'remember' && shownAnswer ? shownAnswer.id : null}
            onRecent={(id) => {
              setChatView(id);
              goTo('remember');
            }}
            onNew={() => {
              setChatView(NEW_VIEW);
              goTo('remember');
            }}
            name={profile.studentName}
            year={profile.currentYear}
            onSettings={() => setIsSettingsOpen(true)}
            afterChoose={api.closeIfDrawer}
            onClose={api.close}
          />
        )}
        panel={(api) => (
          <ProgressPanel
            notes={notes}
            year={profile.currentYear}
            onYearChange={handleYearChange}
            sources={sources}
            onOpenNote={openNoteById}
            onTab={goTo}
            onStartSession={handleStartSession}
            afterChoose={api.closeIfDrawer}
            onClose={api.close}
          />
        )}
      >
        <div className="space-y-5">
          {activeTab === 'remember' && (
            <>
              <ChatTutorView
                messages={chat}
                setMessages={setChat}
                viewId={chatView}
                setViewId={setChatView}
                notes={notes}
                profile={profile}
                setProfile={setProfile}
                onOpenNoteDetail={handleOpenNoteDetail}
                onOpenSource={(id) => {
                  setFocusSourceId(id);
                  goTo('library');
                }}
                pendingAsk={pendingAsk}
                onPendingHandled={() => setPendingAsk(null)}
                onOpenVisual={openVisual}
              />
              <DegreeMemoryView
                notes={notes}
                setNotes={setNotes}
                courses={courses}
                selectedNoteForDetail={selectedNoteForDetail}
                setSelectedNoteForDetail={setSelectedNoteForDetail}
                onAddCourse={addCourse}
                onOpenVisual={openVisual}
              />
            </>
          )}

          {activeTab === 'library' && (
            <LibraryView
              focusId={focusSourceId}
              onFocusDone={() => setFocusSourceId(null)}
              onAsk={(q) => {
                setChatView(NEW_VIEW);
                setPendingAsk(q);
                goTo('remember');
              }}
            />
          )}

          {activeTab === 'visuals' && (
            <Suspense fallback={<p className="py-6 text-sm text-muted" role="status">Loading visuals…</p>}>
              <VisualsView
                notes={notes}
                courses={courses}
                currentYear={profile.currentYear}
                onOpenNote={openNoteById}
                onStartSession={handleStartSession}
                focusTopic={visualFocus}
              />
            </Suspense>
          )}

          {activeTab === 'study' && (
            <StudyView
              notes={notes}
              courses={courses}
              flashcards={flashcards}
              setFlashcards={setFlashcards}
              preset={studyPreset}
            />
          )}

          {activeTab === 'plan' && (
            <PlannerView courses={courses} profile={profile} onStartSession={handleStartSession} />
          )}

          {activeTab === 'blueprints' && (
            <StudyBlueprintsView blueprints={blueprints} setBlueprints={setBlueprints} />
          )}

          {activeTab === 'tutoring' && (
            <PeerTutoringView
              seniorComments={seniorComments}
              setSeniorComments={setSeniorComments}
              tutors={tutors}
              setTutors={setTutors}
              tutorRequests={tutorRequests}
              setTutorRequests={setTutorRequests}
              courses={courses}
            />
          )}

          {activeTab === 'profile' && (
            <LearningProfileView
              profile={profile}
              setProfile={setProfile}
              onLaunchTopicQuiz={handleLaunchTopicQuiz}
            />
          )}

          {activeTab === 'portfolio' && (
            <PortfolioView
              profile={profile}
              skills={skills}
              projects={projects}
              courses={courses}
              notes={notes}
              onOpenNoteDetail={handleOpenNoteDetail}
            />
          )}

          {activeTab === 'quiz' && (
            <QuizView flashcards={flashcards} setFlashcards={setFlashcards} notes={notes} />
          )}
        </div>
      </Shell>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        profile={profile}
        setProfile={setProfile}
        onResetDemo={handleResetDemo}
      />
    </>
  );
}

export function App() {
  return <AuthGate />;
}

export default App;
