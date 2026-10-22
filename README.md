# Grove

**Students who stay quiet go unseen until they fail or speak up, and the AI they turn to doesn't know their university.**

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
| Supervision is stretched | Supervisor workload and slow feedback delay research in Ghana (Amponsah et al., 2026) and Tanzania (Abeid et al., 2025) | Postgraduate, not undergraduate |
| Zambian students use AI heavily | 85.6% of 1,829 students at five universities had used ChatGPT; authors call for clear institutional guidelines (Mudenda et al., 2026) | 91% health students, self-reported |
| AI design decides whether it helps | Unrestricted GPT-4 raised practice grades 48% but left students 17% worse on the exam without it; a guardrailed tutor largely avoided the harm (Bastani et al., 2025) | High-school maths |

**Not found:** any study testing an institution-tied AI against general tools, or the idea of an AI that stays with a student across a degree. Those are hypotheses.

**Hypothesis (untested):** being tied to the institution can get help to students sooner, through past projects while waiting for a supervisor and, with consent, anonymous totals showing where students studying alone get stuck.

Full references are in the project's one-page document.

## What it does today

- **Ask.** Questions are answered from the university library first, then the student's own notes. Every answer lists its sources. Rules and deadlines are never answered from general knowledge.
- **Library.** Browse and search past final-year projects, course outlines and policies. Describe a project idea and Grove finds the closest past projects, shows what each one left open, and suggests questions to bring to a supervisor.
- **Add to the library.** Upload a PDF, Word or text file. In a real deployment only staff could do this.
- **Your notes.** Students upload their own notes; Grove can answer from them too.
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

React 19, TypeScript, Vite, Tailwind v4. Vercel serverless functions for sign-in-gated relaying of AI calls. Notes and library additions stay in the browser's local storage. AI keys stay on the student's device.

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
