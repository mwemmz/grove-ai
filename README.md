# Grove

**Grove is a university's own AI that helps students where lecturers and supervisors can't reach them.**

*Why:* students who stay quiet go unseen until they fail or speak up, and the AI they turn to doesn't know their university.

Grove is a university's own AI. It is given to students in first year and built on that institution's courses, policies, notes and past final-year projects. It answers from that library, cites its sources, and says "not in the library yet" instead of guessing.

## The problem

Seen first-hand by the author, a student (not yet confirmed by interviews):

- **Quiet students go unseen.** Lecturers can only see the students who speak up. In large classes, and while students study alone, struggling goes unnoticed until the student fails or asks for help.
- **Final-year students wait for supervisors.** A supervisor can carry 4 to 6 students, so some wait to be allocated one, while past projects and proposals sit in the library.
- **General AI tools don't know the institution.** A student can feed them their own notes, but out of the box they know nothing about the university's policies, outlines or past projects. True by design; whether this actually harms students is not yet shown.

## What the research says, and what it doesn't

| Point | Evidence | Caveat |
|---|---|---|
| Informal observation misses most struggling students | Among 429 medical students, tutors watching in class spotted about a quarter to a third of those who later failed or dropped out (O'Neill et al., 2016) | Medical school, one course |
| Large classes are normal | 29 of 30 lecturers at two South African universities taught first-year classes of 301 to 450 (Moodley, 2015) | Small sample |
| Zambian lecturers are stretched | Expanded enrolments outstripped capacity at UNZA and CBU; lecturer workloads rose and student-lecturer contact grew less satisfactory (Chipindi, 2011) | Dated, qualitative; no current ratio data |
| Supervision is stretched | Supervisor workload and slow feedback delay research in Ghana (Amponsah et al., 2026) and Tanzania (Abeid et al., 2025) | Postgraduate, not undergraduate |
| Counter-evidence | Malaysian engineering students rated supervisor availability 4.45 out of 5 (Rusli et al., 2023, n=246) | Different country and setting; shows the gap is not universal |
| AI can reach students who don't ask people | Of nearly 7,000 Australian students, AI felt easier to access and less judging, but 60% trusted AI feedback vs 90% for instructors (de Mello Heredia, 2025) | Press report of a survey |
| A course-grounded AI can answer reliably | Jill Watson answered 76.7% of 150 questions vs 31.3% for a commercial retrieval tool; use varied from 15% to 54% across courses (Taneja et al., 2024; Maiti & Goel, 2024) | Preprints, few courses, no learning data |
| AI tutoring can help where staff are stretched | +0.31 SD after six weeks of AI tutoring in Nigeria (De Simone et al., 2025) | School-level |
| Zambian students use AI heavily | 85.6% of 1,829 students at five universities had used ChatGPT; authors call for clear institutional guidelines (Mudenda et al., 2026) | 91% health students, self-reported |
| AI design decides whether it helps | Unrestricted GPT-4 raised practice grades 48% but left students 17% worse on the exam without it; a guardrailed tutor largely avoided the harm (Bastani et al., 2025) | High-school maths |

**Not found:** any study testing an institution-tied AI against general tools, the idea of an AI that stays with a student across a degree, Zambian undergraduate supervision or class-size data, or anything specific to the University of Lusaka. Those are hypotheses or gaps.

**Hypothesis (untested):** being tied to the institution can get help to students sooner, through past projects while waiting for a supervisor and, with consent, anonymous totals showing where students studying alone get stuck.

Full references are in the project's one-page document.

## What it does today

- **Ask.** Questions are answered from the university library first, then the student's own notes. Every answer lists its sources. Rules and deadlines are never answered from general knowledge.
- **Library.** Browse and search past final-year projects, course outlines and policies. Describe a project idea and Grove finds the closest past projects, shows what each one left open, and suggests questions to bring to a supervisor.
- **Add to the library.** Upload a PDF, Word or text file. In a real deployment only staff could do this.
- **Your notes.** Students upload their own notes; Grove can answer from them too.
- **Pictures beside the words (dual coding).** When an answer or a lecture slide talks about an idea Grove has a picture for, the animated diagram appears right next to it, with the step text changing in time with the animation. Nine economics topics are built so far (circular flow, Keynesian cross and multiplier, AD/AS, inflation, money market, credit creation, Phillips curve, the kwacha exchange rate, Laffer curve), each with sliders to change the numbers and a short quiz. They use the course's own worked examples.
- **PowerPoint and notes packs.** Notes can be uploaded as PDF, Word, PowerPoint (.pptx/.pptm, macros never run), text or a Grove notes pack (one .json file holding a whole course).
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

1. Interview 8 to 10 students and 5 lecturers: how final-year projects start, how long the supervisor wait is, what happens when a student falls behind, and whether anyone acts on test marks.
2. Score Grove on a fixed set of 40 questions for correct answers and correct refusals.
3. Get written permission from the library and department before loading any real project, and check the consent design against Zambia's Data Protection Act, 2021.

## Tech

React 19, TypeScript, Vite, Tailwind v4. Animations are [HyperFrames](https://github.com/heygen-com/hyperframes) compositions (HTML + GSAP, Apache-2.0) played with `@hyperframes/player`; the economics ones are generated by `scripts/gen-econ-visuals.py`. Vercel serverless functions for sign-in-gated relaying of AI calls. Notes and library additions stay in the browser's local storage. AI keys stay on the student's device.

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
