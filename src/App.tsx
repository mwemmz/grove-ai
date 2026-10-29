import { lazyWithReload } from './lib/lazyReload';
import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useAuth, useUser } from '@clerk/react';
import { AuthScreen } from './components/AuthScreen';
import { TreePine } from 'lucide-react';
import { AppTab, TAB_LABEL } from './components/Header';
import { Shell } from './components/Shell';
import { BottomNav } from './components/BottomNav';
import { Sidebar } from './components/Sidebar';
import { ProgressPanel } from './components/ProgressPanel';
import { ChatTutorView, NEW_VIEW } from './components/ChatTutorView';
import { TodayView } from './components/TodayView';
import { InsightsView } from './components/InsightsView';
import { setSignalCourses } from './services/signals';
import { DegreeMemoryView } from './components/DegreeMemoryView';
import { StudyBlueprintsView } from './components/StudyBlueprintsView';
import { PeerTutoringView } from './components/PeerTutoringView';
import { LearningProfileView } from './components/LearningProfileView';
import { PortfolioView } from './components/PortfolioView';
import { QuizView } from './components/QuizView';
import { StudyView, StudyPreset } from './components/StudyView';
import { PlannerView } from './components/PlannerView';
import { LibraryView } from './components/LibraryView';
const VisualsView = lazyWithReload(() => import('./components/VisualsView').then((m) => ({ default: m.VisualsView })));
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
import { canSeeCourse, setAdmin, setStudentId } from './services/access';
import { isPastPaper } from './lib/noteOrder';
import { getMe, syncPacks } from './services/packs';
import { setTokenProvider } from './lib/api';
import { Copilot } from './components/Copilot';
import { copilot } from './services/copilot';
import { indexNotes, warmUp } from './services/semantic';

function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="min-h-dvh bg-bg text-text flex flex-col items-center justify-center gap-4 font-sans">
      <TreePine className="h-9 w-9 text-accent animate-pulse" />
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}

function AuthGate() {
  const { isLoaded, isSignedIn, getToken } = useAuth();

  // Wire the token before the app renders: its data-loading effect runs before any effect here would,
  // so setting this in an effect sent the first requests with no token (401) after a reload.
  if (isLoaded) setTokenProvider(getToken);

  if (!isLoaded) {
    return <LoadingScreen label="Starting Grove..." />;
  }
  if (!isSignedIn) {
    return <AuthScreen />;
  }
  return <GroveApp />;
}

function GroveApp() {
  const { user } = useUser();
  const accountName = user?.fullName || user?.username || '';
  // Decides programme-only material (e.g. BIT353 for IDs starting with BIT) for everything rendered below.
  setStudentId(user?.username);
  // Admins see every course; whether this account is one comes from the server.
  const [isAdmin, setIsAdmin] = useState(false);
  const [meLoaded, setMeLoaded] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  setAdmin(isAdmin);
  useEffect(() => {
    getMe()
      .then((me) => {
        setIsAdmin(!!me.admin);
        setIsStaff(!!me.staff);
      })
      .catch(() => { /* offline: treated as a student */ })
      .finally(() => setMeLoaded(true));
  }, []);
  const [activeTab, setActiveTab] = useState<AppTab>('today');
  // The assistant always knows which screen it was opened from.
  useEffect(() => {
    copilot.setContext({ place: TAB_LABEL[activeTab] });
  }, [activeTab]);

  const [isDataReady, setIsDataReady] = useState(false);

  const [notes, setNotes] = useState<Note[]>([]);
  // Search by meaning: load the model when the browser is idle, then keep note vectors up to date.
  useEffect(() => {
    const go = () => void warmUp().then((ok) => ok && indexNotes(notesRef.current));
    const w = window as unknown as { requestIdleCallback?: (f: () => void) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(go);
    else setTimeout(go, 3000);
  }, []);
  const notesRef = useRef(notes);
  useEffect(() => {
    notesRef.current = notes;
    indexNotes(notes);
  }, [notes]);

  const [courses, setCourses] = useState<Course[]>([]);
  const shownCourses = courses.filter((c) => canSeeCourse(c.code));
  useEffect(() => setSignalCourses(courses), [courses]);
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

  // The sidebar shows the signed-in student's own name, not the demo student's.
  useEffect(() => {
    if (!accountName || !isDataReady) return;
    setProfile((p) => (!p.studentName || p.studentName === 'Alex Chimwaza' ? { ...p, studentName: accountName } : p));
  }, [accountName, isDataReady]);

  // Course notes the university has published for this student (e.g. BIT353 for BIT IDs) arrive automatically.
  const [packNotice, setPackNotice] = useState<string | null>(null);
  const packsChecked = useRef(false);
  useEffect(() => {
    if (!isDataReady || !meLoaded || packsChecked.current || !storage.isHydrated()) return;
    packsChecked.current = true;
    void syncPacks(storage.getNotes(), storage.getCourses()).then((r) => {
      if (!r) return;
      if (r.newCourses.length) setCourses((prev) => [...prev, ...r.newCourses.filter((c) => !prev.some((p) => p.code === c.code))]);
      setNotes(r.notes);
      storage.saveNotes(r.notes);
      if (r.newCourses.length) storage.saveCourses([...storage.getCourses(), ...r.newCourses.filter((c) => !storage.getCourses().some((p) => p.code === c.code))]);
      if (r.added.length) setPackNotice(`Added from your university: ${r.added.map((a) => `${a.count} ${a.code} notes`).join(', ')}.`);
      else if (r.updated.length) setPackNotice(`Your university improved ${r.updated.map((a) => `${a.count} ${a.code} notes`).join(', ')}.`);
    });
  }, [isDataReady, meLoaded]);

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
    try { localStorage.setItem('grove_last_note', note.id); } catch { /* private mode: fine */ }
    setActiveTab(isPastPaper(note) ? 'papers' : 'notes');
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
        bottom={(openMenu) => <BottomNav tab={activeTab} onTab={goTo} onMenu={openMenu} />}
        sidebar={(api) => (
          <Sidebar
            staff={isStaff}
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
            flashcards={flashcards}
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
          {packNotice && (
            <div role="status" className="flex items-start justify-between gap-3 rounded-[22px] bg-surface px-4 py-3 text-sm text-text ring-1 ring-accent/50">
              <span>{packNotice} Find them under Notes.</span>
              <button onClick={() => setPackNotice(null)} className="text-muted hover:text-text" aria-label="Dismiss">✕</button>
            </div>
          )}
          {activeTab === 'today' && (
            <TodayView
              notes={notes}
              courses={shownCourses}
              flashcards={flashcards}
              lastNoteId={(() => { try { return localStorage.getItem('grove_last_note'); } catch { return null; } })()}
              onOpenNote={openNoteById}
              onGo={goTo}
              name={profile.studentName}
              year={profile.currentYear}
              onAddCards={(cards) => setFlashcards((all) => [...all, ...cards.filter((c) => !all.some((a) => a.noteId === c.noteId && a.front === c.front))])}
            />
          )}
          {activeTab === 'insights' && isStaff && <InsightsView />}

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
            </>
          )}

          {(activeTab === 'notes' || activeTab === 'papers') && (
            <DegreeMemoryView
              key={activeTab}
              mode={activeTab === 'papers' ? 'papers' : 'notes'}
              notes={notes}
              setNotes={setNotes}
              courses={shownCourses}
              selectedNoteForDetail={selectedNoteForDetail}
              setSelectedNoteForDetail={setSelectedNoteForDetail}
              onAddCourse={addCourse}
              onOpenVisual={openVisual}
            />
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
                courses={shownCourses}
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
              courses={shownCourses}
              flashcards={flashcards}
              setFlashcards={setFlashcards}
              preset={studyPreset}
            />
          )}

          {activeTab === 'plan' && (
            <PlannerView courses={shownCourses} profile={profile} onStartSession={handleStartSession} />
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
              courses={shownCourses}
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
              courses={shownCourses}
              notes={notes}
              onOpenNoteDetail={handleOpenNoteDetail}
            />
          )}

          {activeTab === 'quiz' && (
            <QuizView flashcards={flashcards} setFlashcards={setFlashcards} notes={notes} />
          )}
        </div>
      </Shell>

      <Copilot notes={notes} profile={profile} setProfile={setProfile} onOpenNote={openNoteById} />

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
