import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useAuth, SignInButton } from '@clerk/react';
import { TreePine } from 'lucide-react';
import { Header, Tabs, AppTab } from './components/Header';
import { ChatTutorView } from './components/ChatTutorView';
import { DegreeMemoryView } from './components/DegreeMemoryView';
import { StudyBlueprintsView } from './components/StudyBlueprintsView';
import { PeerTutoringView } from './components/PeerTutoringView';
import { LearningProfileView } from './components/LearningProfileView';
import { PortfolioView } from './components/PortfolioView';
import { QuizView } from './components/QuizView';
import { StudyView, StudyPreset } from './components/StudyView';
import { PlannerView } from './components/PlannerView';
const VisualsView = lazy(() => import('./components/VisualsView').then((m) => ({ default: m.VisualsView })));
import { SettingsModal } from './components/SettingsModal';
import {
  Note,
  Course,
  LearningProfile,
  Flashcard,
  PortfolioSkill,
  PortfolioProject,
  SeniorComment,
  StudyBlueprint,
  TutorProfile,
  TutorRequest,
} from './types';
import { storage } from './services/storage';
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [studyPreset, setStudyPreset] = useState<StudyPreset | null>(null);

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
    setActiveTab('remember');
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

  return (
    <div className="app-shell min-h-dvh bg-bg font-sans text-text selection:bg-accent/30">
      <div className="mx-auto w-full max-w-[900px] px-4 pb-16 pt-6">
        <Header
          notes={notes}
          year={profile.currentYear}
          onYearChange={handleYearChange}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
        <Tabs
          active={activeTab}
          onChange={(tab) => {
            setStudyPreset(null);
            setActiveTab(tab);
          }}
        />

        <main className="app-main space-y-5">
          {activeTab === 'remember' && (
            <>
              <ChatTutorView
                notes={notes}
                profile={profile}
                setProfile={setProfile}
                onOpenNoteDetail={handleOpenNoteDetail}
              />
              <DegreeMemoryView
                notes={notes}
                setNotes={setNotes}
                courses={courses}
                selectedNoteForDetail={selectedNoteForDetail}
                setSelectedNoteForDetail={setSelectedNoteForDetail}
              />
            </>
          )}

          {activeTab === 'visuals' && (
            <Suspense fallback={<p className="py-6 text-sm text-muted" role="status">Loading visuals…</p>}>
              <VisualsView />
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
        </main>
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        profile={profile}
        setProfile={setProfile}
        onResetDemo={handleResetDemo}
      />
    </div>
  );
}

export function App() {
  return <AuthGate />;
}

export default App;
