# Grove

**Grove is a university's own AI that helps students where lecturers can't reach them.**

*Why:* students who stay quiet go unseen until they fail or speak up, and the AI they turn to doesn't know their university.

Grove is a university's own AI. It is given to students in first year and built on that institution's courses, policies, notes and past final-year projects. It answers from that library, cites its sources, and says "not in the library yet" instead of guessing.

## The problem

Seen first-hand by the author, a student (not yet confirmed by interviews):

- **Quiet students go unseen.** Lecturers can only see the students who speak up. In large classes, and while students study alone, struggling goes unnoticed until the student fails or asks for help.
- **General AI tools don't know the institution.** A student can feed them their own notes, but out of the box they know nothing about the university's policies, outlines or past projects. True by design; whether this actually harms students is not yet shown.

## What the research says, and what it doesn't

| Point | Evidence | Caveat |
|---|---|---|
| Informal observation misses most struggling students | Among 429 medical students, tutors watching in class spotted about a quarter to a third of those who later failed or dropped out (O'Neill et al., 2016) | Medical school, one course |
| Large classes are normal | 29 of 30 lecturers at two South African universities taught first-year classes of 301 to 450 (Moodley, 2015) | Small sample |
| Zambian lecturers are stretched | Expanded enrolments outstripped capacity at UNZA and CBU; lecturer workloads rose and student-lecturer contact grew less satisfactory (Chipindi, 2011) | Dated, qualitative; no current ratio data |
| AI can reach students who don't ask people | Of nearly 7,000 Australian students, AI felt easier to access and less judging, but 60% trusted AI feedback vs 90% for instructors (de Mello Heredia, 2025) | Press report of a survey |
| A course-grounded AI can answer reliably | Jill Watson answered 76.7% of 150 questions vs 31.3% for a commercial retrieval tool; use varied from 15% to 54% across courses (Taneja et al., 2024; Maiti & Goel, 2024) | Preprints, few courses, no learning data |
| AI tutoring can help where staff are stretched | +0.31 SD after six weeks of AI tutoring in Nigeria (De Simone et al., 2025) | School-level |
| Zambian students use AI heavily | 85.6% of 1,829 students at five universities had used ChatGPT; authors call for clear institutional guidelines (Mudenda et al., 2026) | 91% health students, self-reported |
| AI design decides whether it helps | Unrestricted GPT-4 raised practice grades 48% but left students 17% worse on the exam without it; a guardrailed tutor largely avoided the harm (Bastani et al., 2025) | High-school maths |

**Not found:** any study testing an institution-tied AI against general tools, the idea of an AI that stays with a student across a degree, Zambian undergraduate class-size data, or anything specific to the University of Lusaka. Those are hypotheses or gaps.

**Hypothesis (untested):** being tied to the institution can get help to students sooner, through anonymous totals, with consent, showing where students studying alone get stuck.

Full references are in the project's one-page document.

## What it does today

- **Ask.** Questions are answered from the university library first, then the student's own notes. Every answer lists its sources. Rules and deadlines are never answered from general knowledge.
- **Library.** Browse and search past final-year projects, course outlines and policies. Describe a project idea and Grove finds the closest past projects, shows what each one left open, and suggests questions to bring to a supervisor.
- **Add to the library.** Upload a PDF, Word or text file. In a real deployment only staff could do this.
- **Simple by default.** Grove opens on Today: pick up your last note, start a study session, quiz yourself or ask a question, one tap each. The menu has five items (Today, Notes, Ask, Study, Plan); Recall, Visuals, Library, How I learn, Portfolio and the rest sit under More. The Progress panel starts closed, long lists collapse per course, and optional settings sit behind a tap.
- **Smart without an AI key.** Grove splits your notes into the same sections the reader shows, finds the one a question is about (it learns abbreviations like ETL from your own notes), and answers in the shape asked for: a comparison table for "difference between", numbered steps for "how does X work", a definition for "what is". Recall can turn your notes into flashcards in one tap. With a key, the AI is given those matching sections instead of the first page of each note.
- **Notes.** Its own item in the menu. Students upload their own notes (or get their programme's pack) and Grove can answer from them too. Grove starts empty: no sample notes, courses or people. Accounts made earlier have their old sample records cleared the next time they load.
- **Pictures beside the words (dual coding).** When an answer or a lecture slide talks about an idea Grove has a picture for, the animated diagram appears right next to it, with the step text changing in time with the animation. Nine economics topics are built so far (circular flow, Keynesian cross and multiplier, AD/AS, inflation, money market, credit creation, Phillips curve, the kwacha exchange rate, Laffer curve), each with sliders to change the numbers and a short quiz. They use the course's own worked examples.
- **Full-screen notes with their own diagrams.** Tapping a note opens a full-screen reader: numbered headed sections, an outline to jump around, a one-page map of the whole note, and a "terms to know" list. Grove draws diagrams from the note's own shape, with no AI needed: pyramids and layer stacks for levels and tiers, flow strips for steps, breakdown trees for "one thing splits into these", and for-and-against panels. Each section ends with a cover-it-and-recall prompt. The animated pictures still sit beside the idea they explain.
- **Programme-only material.** Some courses are limited to one programme by student ID. BIT353 Big Data and Data Warehousing (eight animated topics: ETL, star schema, OLAP cube operations, HDFS, MapReduce and Spark, batch vs real-time, data mining, the Big Data stack, four with labs) is shown only to students whose ID starts with BIT. Others don't see its pictures, can't import its notes, and don't see the course. Its notes are published once by an admin (Settings → Notes packs) and stored in Grove's database; the server checks each student's ID with Clerk before handing them over, and adds them automatically for BIT students. Admins are listed in the `GROVE_ADMINS` environment variable (comma-separated emails or student IDs). The animations themselves are public files; only the notes are protected.
- **PowerPoint and notes packs.** Notes can be uploaded as PDF, Word, PowerPoint (.pptx/.pptm, macros never run; slide titles are read from the title placeholder and bullet levels are kept), text or a Grove notes pack (one .json file holding a whole course).
- **Study and Plan.** Recall-first study sessions and a planner. These support the main idea; they are not the point of it.
- **Bring your own AI key.** Optional. Without a key, Grove answers by quoting the library. With one, a model writes the answer from the same sources, with automatic failover across providers.

## What is real and what is demo

The library ships with **fictional sample records** (marked "Demo record") so the app can be tried without any university's data. Nothing in them is a real student, supervisor or policy. A real deployment would load the institution's own records, with permission from the authors of the work and the university.

Not built yet: the staff view of where students struggle (opt-in, anonymous totals only), accounts per institution, and a shared server-side AI key. The "closest past project" matching is keyword search, not a trained model.

## How a question is answered

1. The question is searched against the library (title and tag matches weigh most, rare words weigh more than common ones).
2. Matching records are quoted back. With an AI key, they are also passed to the model with strict instructions: cite by title, answer university rules only from the library, never write the student's project for them.
3. If the question is about the university itself and nothing matches, Grove says so and does not call the model at all.

## Next tests

1. Interview 8 to 10 students and 5 lecturers: how students get help today, what happens when a student falls behind, and whether anyone acts on test marks.
2. Score Grove on a fixed set of 40 questions for correct answers and correct refusals.
3. Get written permission from the library and department before loading any real project, and check the consent design against Zambia's Data Protection Act, 2021.

## Tech

React 19, TypeScript, Vite, Tailwind v4. Animations are [HyperFrames](https://github.com/heygen-com/hyperframes) compositions (HTML + GSAP, Apache-2.0) played with `@hyperframes/player`; the economics and BIT353 ones are generated by `scripts/gen-econ-visuals.py` and `scripts/gen-bit-visuals.py`. Vercel serverless functions for sign-in-gated relaying of AI calls. Notes and library additions stay in the browser's local storage. AI keys stay on the student's device.

## Accounts

Students sign in with their **email or student ID** and a password, on Grove's own sign-in page. Grove uses [Clerk](https://clerk.com) underneath: Clerk stores the passwords (hashed, and checked against known breaches), sends the email codes, and keeps the sessions. The student ID is stored as the Clerk username. New accounts confirm their email with a 6-digit code; forgotten passwords are reset the same way. Settings shows who is signed in, every device with an active session, and lets the student sign out one device or all of them.

For this to work, switch these on in the Clerk dashboard (**User & authentication → Email, phone, username**):

1. **Email address**: on, required, "Verify at sign-up" with **email verification code**.
2. **Username**: on, required, "Used for sign-in". This is the student ID.
3. **Password**: on.
4. **Name** (first and last): on.

## Run it

```bash
git clone https://github.com/mwemmz/grove-ai.git
cd grove-ai
npm install
npm run dev
```

Open http://localhost:5173.

## License

MIT.
