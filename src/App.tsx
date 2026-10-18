import React, { useState, useEffect, useRef } from 'react';
import { useAuth, SignInButton } from '@clerk/react';
import { TreePine } from 'lucide-react';
import { Header, BottomNav, AppTab } from './components/Header';
import { Segmented } from './components/ui';
import { ChatTutorView } from './components/ChatTutorView';
import { DegreeMemoryView } from './components/DegreeMemoryView';
import { StudyBlueprintsView } from './components/StudyBlueprintsView';
import { PeerTutoringView } from './components/PeerTutoringView';
import { LearningProfileView } from './components/LearningProfileView';
import { PortfolioView } from './components/PortfolioView';
import { QuizView } from './components/QuizView';
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
        <h1 className="text-3xl font-semibold tracking-tight mb-2">Grove</h1>
        <p className="text-muted mb-8">
          A study companion that remembers your whole degree.
        </p>
        <SignInButton mode="modal">
          <button className="w-full min-h-11 rounded-lg bg-accent-strong hover:bg-accent hover:text-bg text-white font-semibold transition-colors">
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
  const [activeTab, setActiveTab] = useState<AppTab>('chat');
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
    setActiveTab('notes');
  };

  const handleLaunchTopicQuiz = (_topic: string) => {
    setActiveTab('quiz');
  };

  if (!isDataReady) {
    return <LoadingScreen label="Loading your degree memory..." />;
  }

  const youView = activeTab === 'profile' || activeTab === 'portfolio';
  const communityView = activeTab === 'blueprints' || activeTab === 'tutoring';

  return (
    <div className="app-shell h-dvh bg-bg text-text flex flex-col font-sans selection:bg-accent/30">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="app-main flex-1 min-h-0 overflow-y-auto">
        {youView && (
          <div className="mx-auto w-full max-w-3xl px-4 pt-5 sm:px-6">
            <Segmented
              label="You"
              value={activeTab as 'profile' | 'portfolio'}
              onChange={setActiveTab}
              options={[
                { id: 'profile', label: 'How I learn' },
                { id: 'portfolio', label: 'Portfolio & CV' },
              ]}
            />
          </div>
        )}
        {communityView && (
          <div className="mx-auto w-full max-w-5xl px-4 pt-5 sm:px-6">
            <Segmented
              label="Community"
              value={activeTab as 'blueprints' | 'tutoring'}
              onChange={setActiveTab}
              options={[
                { id: 'blueprints', label: 'Study blueprints' },
                { id: 'tutoring', label: 'Peer tutoring' },
              ]}
            />
          </div>
        )}

        {activeTab === 'chat' && (
          <ChatTutorView
            notes={notes}
            profile={profile}
            setProfile={setProfile}
            onOpenNoteDetail={handleOpenNoteDetail}
          />
        )}

        {activeTab === 'notes' && (
          <DegreeMemoryView
            notes={notes}
            setNotes={setNotes}
            courses={courses}
            selectedNoteForDetail={selectedNoteForDetail}
            setSelectedNoteForDetail={setSelectedNoteForDetail}
          />
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

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

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
