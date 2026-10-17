# 🌲 Grove — Degree-Long AI Learning Companion & Portfolio

> **The AI study companion that stays with a student from freshman year to graduation, growing with them, adapting to their cognitive style, and transforming 4 years of coursework into an evidence-backed career portfolio.**

[![React](https://img.shields.io/badge/React-19.2-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-4.x-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 💡 The Core Problem & Resume Angle

Most AI learning systems suffer from **"AI Tutor Amnesia"**:
- Every semester or chat starts from zero context.
- They compete solely on *"upload a PDF and get a summary"*.
- They hide what they think they know about the student behind black-box prompts.
- When graduation arrives, four years of intense coursework, proofs, and code vanish into disorganized folders.

### 🌟 What Makes Grove Different
Grove turns this paradigm on its head by anchoring itself to the student's **entire 4-year degree**:
1. **Degree-Long Memory Engine (Cross-Year RAG)**:
   - When a Year 3 or 4 student asks about distributed consensus (*Raft/Paxos*), Grove answers and explicitly links back to their Year 2 *Operating Systems* foundations (*Dijkstra's semaphores, mutex locks, and deadlock Coffman conditions*).
   - "Where did I first learn this?" chronological lineage tracing across freshman to senior year.
2. **Visible & Adaptive "How I Learn" Profile**:
   - The student can inspect and directly adjust how Grove explains concepts (Code-First, First Principles, Analogies, Academic Proof, Socratic).
   - Interactive feedback pills under every answer (*"Too long"*, *"Give an analogy"*, *"Show code example"*, *"I'm lost"*) mutate the profile in real-time.
   - **Transparent Cognitive Audit Log**: No black boxes. Every inference Grove makes is logged with confidence scores, timestamps, and manual overrides.
3. **Evidence-Backed Graduation Portfolio & CV Generator**:
   - Compiles 4 years of verified course notes and capstone deliverables into an interactive portfolio.
   - Generates a polished, professional CV where **every technical skill is backed by an evidence link** pointing directly to the coursework and notes where the skill was acquired.
   - Instant Markdown export, PDF print/save, and copy-to-clipboard.
4. **SuperMemo Spaced-Repetition Active Recall Engine**:
   - Auto-generates flashcards from course notes across all 4 years.
   - Spaced repetition algorithm (Again, Hard, Good, Easy) tracking mastery and decay.
5. **Zero-Setup Offline Intelligence + Bring-Your-Own-Key**:
   - Works 100% out of the box with zero API keys required, using an intelligent local simulation engine.
   - Supports Google Gemini and OpenAI API keys for live LLM generation.

---

## 🚀 Ready-to-Use Resume Bullet Points

You can copy and adapt these bullet points directly for your resume, CV, or LinkedIn profile:

> - **Developed Grove**, a full-stack degree-long AI study companion and portfolio generator built with React 19, TypeScript, and Tailwind CSS, featuring cross-year retrieval-augmented generation (RAG) across 4 years of academic coursework.
> - **Engineered an adaptive cognitive telemetry engine** that dynamically tunes explanation styles (Code-First, First Principles, Socratic) and maintains a transparent, user-editable audit log of student learning patterns.
> - **Built an automated graduation CV generator** with an evidence-backed verification matrix linking technical competencies directly to course notes, lab outcomes, and git repositories.
> - **Implemented an active recall engine** utilizing SuperMemo spaced repetition algorithms with interval calculation and topic revisit diagnostics.

---

## 🛠 Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Canvas Confetti
- **Build Tool**: Vite
- **Storage & State**: LocalStorage with automatic schema migration, JSON full-degree backup export/import
- **AI Engine**: Hybrid architecture (zero-latency local degree retrieval + optional Gemini/OpenAI API integration)

---

## 🏁 Quickstart & Installation

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)

### Setup Instructions

```bash
# Clone the repository
git clone https://github.com/alexchimwaza/grove-ai.git

# Navigate into the project directory
cd grove-ai

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📁 Project Structure

```
grove-ai/
├── src/
│   ├── components/
│   │   ├── Header.tsx              # Concentric Tree Rings indicator, navigation & stats
│   │   ├── ChatTutorView.tsx       # NotebookLM-style tutor with citations & feedback pills
│   │   ├── DegreeMemoryView.tsx    # 4-year notes explorer, filter by year/course & note editor
│   │   ├── LearningProfileView.tsx # "How I Learn" dials, weak topic radar, transparent audit log
│   │   ├── PortfolioView.tsx       # Tree rings timeline, evidence-backed skills & CV generator
│   │   ├── QuizView.tsx            # Spaced repetition flashcards with SuperMemo intervals
│   │   └── SettingsModal.tsx       # Data export/import, demo data reset, API key configuration
│   ├── data/
│   │   └── mockData.ts             # Rich 4-year Computer Science degree curriculum & sample notes
│   ├── services/
│   │   ├── aiService.ts            # Degree-long RAG, cross-year synthesizer & feedback processor
│   │   ├── portfolioService.ts     # CV markdown generation & evidence aggregation
│   │   └── storage.ts              # LocalStorage persistence & backup management
│   ├── types/
│   │   └── index.ts                # TypeScript interfaces for notes, profile, CV & flashcards
│   ├── App.tsx                     # Main application layout & global state
│   ├── index.css                   # Custom theme & animation keyframes
│   └── main.tsx                    # React DOM entry point
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 📄 License

MIT License. Free to use, adapt, and build upon.
