import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ChatTutorView } from './components/ChatTutorView';
import { DegreeMemoryView } from './components/DegreeMemoryView';
import { LearningProfileView } from './components/LearningProfileView';
import { PortfolioView } from './components/PortfolioView';
import { QuizView } from './components/QuizView';
import { SettingsModal } from './components/SettingsModal';
import { Note, Course, LearningProfile, Flashcard, PortfolioSkill, PortfolioProject } from './types';
import { storage } from './services/storage';

export function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'notes' | 'profile' | 'portfolio' | 'quiz'>('chat');
  const [notes, setNotes] = useState<Note[]>(() => storage.getNotes());
  const [courses, setCourses] = useState<Course[]>(() => storage.getCourses());
  const [profile, setProfile] = useState<LearningProfile>(() => storage.getProfile());
  const [flashcards, setFlashcards] = useState<Flashcard[]>(() => storage.getFlashcards());
  const [skills, setSkills] = useState<PortfolioSkill[]>(() => storage.getSkills());
  const [projects, setProjects] = useState<PortfolioProject[]>(() => storage.getProjects());

  const [selectedNoteForDetail, setSelectedNoteForDetail] = useState<Note | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Sync to storage on state changes
  useEffect(() => {
    storage.saveNotes(notes);
  }, [notes]);

  useEffect(() => {
    storage.saveCourses(courses);
  }, [courses]);

  useEffect(() => {
    storage.saveProfile(profile);
  }, [profile]);

  useEffect(() => {
    storage.saveFlashcards(flashcards);
  }, [flashcards]);

  const handleResetDemo = () => {
    storage.resetAllToDemo();
    setNotes(storage.getNotes());
    setCourses(storage.getCourses());
    setProfile(storage.getProfile());
    setFlashcards(storage.getFlashcards());
    setSkills(storage.getSkills());
    setProjects(storage.getProjects());
  };

  const handleOpenNoteDetail = (note: Note) => {
    setSelectedNoteForDetail(note);
    setActiveTab('notes');
  };

  const handleLaunchTopicQuiz = (_topic: string) => {
    setActiveTab('quiz');
  };

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

export default App;
