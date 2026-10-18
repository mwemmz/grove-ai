import React, { useState, useEffect, useRef } from 'react';
import { useAuth, SignInButton } from '@clerk/react';
import { TreePine } from 'lucide-react';
import { Header, AppTab } from './components/Header';
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
    <div className="min-h-screen bg-[#090b10] text-slate-100 flex flex-col items-center justify-center gap-4 font-sans">
      <TreePine className="h-10 w-10 text-emerald-400 animate-pulse" />
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  );
}

function SignInScreen() {
  return (
    <div className="min-h-screen bg-[#090b10] text-slate-100 flex items-center justify-center font-sans">
      <div className="w-full max-w-md rounded-2xl bg-[#0f121a] border border-white/[0.08] p-8 text-center shadow-2xl shadow-black/60">
        <TreePine className="h-10 w-10 text-emerald-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Grove</h1>
        <p className="text-sm text-slate-400 mb-6">
          Your degree-long AI learning companion. Sign in to load your degree memory, notes, and
          portfolio from the cloud.
        </p>
        <SignInButton mode="modal">
          <button className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold py-3 transition-colors">
            Sign in to Grove
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

  return (
    <div className="min-h-screen bg-[#090b10] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Navbar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        profile={profile}
        totalNotes={notes.length}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main View Container */}
      <main className="flex-1 flex flex-col">
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
          <StudyBlueprintsView
            blueprints={blueprints}
            setBlueprints={setBlueprints}
          />
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
          <QuizView
            flashcards={flashcards}
            setFlashcards={setFlashcards}
            notes={notes}
          />
        )}
      </main>

      {/* Settings Modal */}
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
