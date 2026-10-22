# Grove

**The AI that knows your university.**

Grove answers a student's questions from their own university's material (past final-year projects, course outlines, policies) and from the student's own notes. It shows which source it used, and it says "that is not in the library" instead of guessing.

## The problem

Students can't get reliable answers about their own courses and university, so they guess, miss deadlines and fall behind. The university finds out only when they fail.

The sharpest case is the final-year project. Supervisors are few and students are many. One supervisor can carry five or six projects, and students wait weeks to be allocated one. Meanwhile the answers to most of their early questions already exist in past projects sitting in the library, where nobody can search them.

## Why not just use ChatGPT?

ChatGPT knows the world. It does not know your course, your handbook or the projects your department has already supervised, and it will answer anyway.

| | General chatbot | Grove |
|---|---|---|
| Knows your university's rules and past projects | No | Yes, answers from the library |
| When it doesn't know | Guesses | Says "not in the library yet" and who to ask |
| Shows where an answer came from | Rarely | Every answer names its sources |
| Past final-year projects | Can't see them | Finds the closest ones and what they left open |
| Tells the university who needs help | No | Planned (opt-in, aggregated) |

## What it does today

- **Ask.** Questions are answered from the university library first, then the student's own notes. Every answer lists its sources. Rules and deadlines are never answered from general knowledge.
- **Library.** Browse and search past final-year projects, course outlines and policies. Describe a project idea and Grove finds the closest past projects, shows what each one left open, and suggests questions to bring to a supervisor.
- **Add to the library.** Upload a PDF, Word or text file. In a real deployment only staff could do this.
- **Your notes.** Students upload their own notes; Grove can answer from them too.
- **Study and Plan.** Recall-first study sessions and a planner. These support the main idea; they are not the point of it.
- **Bring your own AI key.** Optional. Without a key, Grove answers by quoting the library. With one, a model writes the answer from the same sources, with automatic failover across providers.

## What is real and what is demo

The library ships with **fictional sample records** (marked "Demo record") so the app can be tried without any university's data. Nothing in them is a real student, supervisor or policy. A real deployment would load the institution's own records, with permission from the authors of the work.

Not built yet: the staff view of who is struggling, accounts per institution, and a shared server-side AI key. The "which past project is closest" matching is keyword search, not a trained model.

## How a question is answered

1. The question is searched against the library (title and tag matches weigh most, rare words weigh more than common ones).
2. Matching records are quoted back. With an AI key, they are also passed to the model with strict instructions: cite by title, answer university rules only from the library, never write the student's project for them.
3. If the question is about the university itself and nothing matches, Grove says so and does not call the model at all.

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
