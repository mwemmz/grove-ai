import { 
  Course, 
  Note, 
  LearningProfile, 
  Flashcard, 
  PortfolioSkill, 
  PortfolioProject,
  SeniorComment,
  StudyBlueprint,
  TutorProfile,
  TutorRequest
} from '../types/index.js';

/* Grove starts empty: no sample notes, courses or people. Courses and notes arrive from the student's own files
   and from notes packs published for their programme. (ECF110 is the one built-in course.) */
export const INITIAL_COURSES: Course[] = [
  {
    id: 'c-ecf110',
    code: 'ECF110',
    name: 'Introduction to Macroeconomics',
    year: 1,
    semester: 2,
    color: '#0ea5e9', // sky
    description: 'National income, AD-AS, the government and monetary sectors, unemployment, inflation and international trade.',
  },
];

export const INITIAL_NOTES: Note[] = [];

export const INITIAL_PROFILE: LearningProfile = {
  studentName: '',
  degreeName: '',
  university: '',
  currentYear: 1,
  explanationStyle: 'first-principles',
  answerLength: 'balanced',
  socraticPacing: false,
  codeLanguagePreference: '',
  strengths: [],
  weakTopics: [],
  memoryLogs: [],
  totalQuestionsAsked: 0,
  studyStreaksDays: 0,
  preferredStudyTime: '',
};

export const INITIAL_FLASHCARDS: Flashcard[] = [];
export const INITIAL_SKILLS: PortfolioSkill[] = [];
export const INITIAL_PROJECTS: PortfolioProject[] = [];
export const INITIAL_SENIOR_COMMENTS: SeniorComment[] = [];
export const INITIAL_STUDY_BLUEPRINTS: StudyBlueprint[] = [];
export const INITIAL_TUTORS: TutorProfile[] = [];
export const INITIAL_TUTOR_REQUESTS: TutorRequest[] = [];
