export type MethodId =
  | 'blurting'
  | 'feynman'
  | 'recall'
  | 'interleaving'
  | 'sq3r'
  | 'cornell'
  | 'dual-coding'
  | 'interrogation'
  | 'socratic'
  | 'memory-palace'
  | 'worked-examples';

export type Runner = 'blurt' | 'feynman' | 'recall' | 'guided';

export interface GuideStep {
  title: string;
  /** {topic} is replaced with the note title. */
  prompt: string;
}

export interface StudyMethod {
  id: MethodId;
  name: string;
  tagline: string;
  bestFor: string;
  /** How well research supports it. Judgement for methods Dunlosky et al. (2013) did not rate. */
  evidence: 'Strong' | 'Good' | 'Mixed';
  defaultMinutes: number;
  runner: Runner;
  /** Overview steps shown before starting. */
  steps: string[];
  guide?: GuideStep[];
}

export const STUDY_METHODS: StudyMethod[] = [
  {
    id: 'blurting',
    name: 'Blurting',
    tagline: 'Close the notes, write everything you remember, then check the gaps.',
    bestFor: 'Revising a whole topic: facts, steps, definitions.',
    evidence: 'Strong',
    defaultMinutes: 25,
    runner: 'blurt',
    steps: ['Read the note for a few minutes', 'Hide it and write what you remember', 'Compare and mark the gaps', 'Turn gaps into flashcards'],
  },
  {
    id: 'feynman',
    name: 'Feynman technique',
    tagline: 'Explain it simply, find where you stall, fix those gaps, explain again.',
    bestFor: 'Concepts, systems and theory you need to truly understand.',
    evidence: 'Good',
    defaultMinutes: 25,
    runner: 'feynman',
    steps: ['Explain the topic to a first-year in plain words', 'Check which key points you covered', 'Answer follow-up questions on the weak spots', 'Explain it again, simpler'],
  },
  {
    id: 'recall',
    name: 'Active recall (flashcards)',
    tagline: 'Answer from memory first, then reveal. Leitner and spaced repetition build on this.',
    bestFor: 'Definitions, formulas, key facts.',
    evidence: 'Strong',
    defaultMinutes: 15,
    runner: 'recall',
    steps: ['See the question', 'Say or write your answer', 'Reveal the answer', 'Mark Got it or Missed'],
  },
  {
    id: 'interleaving',
    name: 'Interleaved practice',
    tagline: 'Mix cards from different topics in one session instead of one topic at a time.',
    bestFor: 'Exam preparation and problem-solving courses.',
    evidence: 'Good',
    defaultMinutes: 25,
    runner: 'recall',
    steps: ['Cards come from across your degree', 'Answer each from memory', 'Expect it to feel harder than blocked practice', 'Review what you missed'],
  },
  {
    id: 'sq3r',
    name: 'SQ3R',
    tagline: 'Survey, Question, Read, Recite, Review.',
    bestFor: 'Reading chapters, papers and long notes.',
    evidence: 'Good',
    defaultMinutes: 40,
    runner: 'guided',
    steps: ['Survey', 'Question', 'Read', 'Recite', 'Review'],
    guide: [
      { title: 'Survey', prompt: 'Skim the headings, summary and key terms of "{topic}". What is the big picture in one line?' },
      { title: 'Question', prompt: 'Turn each heading into a question you expect the text to answer. Write three.' },
      { title: 'Read', prompt: 'Read one section at a time, looking only for the answer to your questions.' },
      { title: 'Recite', prompt: 'Close the note. Answer each question out loud or in writing, in your own words.' },
      { title: 'Review', prompt: 'Reopen the note and check your answers. Mark anything you missed, then repeat those.' },
    ],
  },
  {
    id: 'cornell',
    name: 'Cornell notes',
    tagline: 'Notes, cue questions, then cover the notes and quiz yourself.',
    bestFor: 'Turning lecture notes into something you can test yourself on.',
    evidence: 'Mixed',
    defaultMinutes: 30,
    runner: 'guided',
    steps: ['Trim the notes', 'Write cues', 'Cover and quiz', 'Summarise'],
    guide: [
      { title: 'Trim the notes', prompt: 'Re-read your note on "{topic}" and cut it down to the main points.' },
      { title: 'Write cues', prompt: 'In a margin, write a question or keyword for each main point.' },
      { title: 'Cover and quiz', prompt: 'Cover the notes. Answer each cue from memory, then uncover and check.' },
      { title: 'Summarise', prompt: 'Write a two-sentence summary of "{topic}" at the bottom of the page.' },
    ],
  },
  {
    id: 'dual-coding',
    name: 'Dual coding',
    tagline: 'Draw it. Pair words with a diagram.',
    bestFor: 'Architectures, networks, memory layouts, processes.',
    evidence: 'Good',
    defaultMinutes: 25,
    runner: 'guided',
    steps: ['Sketch', 'Label', 'Compare', 'Explain'],
    guide: [
      { title: 'Sketch', prompt: 'Draw "{topic}" as a diagram: boxes, arrows or a timeline. No words yet.' },
      { title: 'Label', prompt: 'Add short labels in your own words.' },
      { title: 'Compare', prompt: 'Compare your drawing with your note. What did the drawing leave out?' },
      { title: 'Explain', prompt: 'Walk through your diagram out loud as if teaching someone.' },
    ],
  },
  {
    id: 'interrogation',
    name: 'Elaborative interrogation',
    tagline: 'Keep asking "why is that true?"',
    bestFor: 'Facts that have a reason behind them.',
    evidence: 'Good',
    defaultMinutes: 20,
    runner: 'guided',
    steps: ['State a fact', 'Ask why', 'Ask why again', 'Check the note'],
    guide: [
      { title: 'State a fact', prompt: 'Pick one fact from your note on "{topic}" and say it in a sentence.' },
      { title: 'Ask why', prompt: 'Ask "why is that true?" and answer in your own words before looking anything up.' },
      { title: 'Ask why again', prompt: 'Ask "why" about your answer. Go one level deeper.' },
      { title: 'Check the note', prompt: 'Compare your reasoning with the note. Fix any gap and repeat with a second fact.' },
    ],
  },
  {
    id: 'socratic',
    name: 'Socratic questioning',
    tagline: 'Work through a chain of guiding questions instead of reading an answer.',
    bestFor: 'Reasoning, design decisions, trade-offs.',
    evidence: 'Good',
    defaultMinutes: 25,
    runner: 'guided',
    steps: ['What problem?', 'What if removed?', 'Where does it fail?', 'Connect to earlier years', 'One-sentence answer'],
    guide: [
      { title: 'What problem does it solve?', prompt: 'What problem does "{topic}" solve, and for whom?' },
      { title: 'What if it were gone?', prompt: 'What would break or get worse without it?' },
      { title: 'Where does it fail?', prompt: 'Name one situation where it does not work well and say why.' },
      { title: 'Connect it back', prompt: 'Which idea from an earlier year does it build on?' },
      { title: 'Say it simply', prompt: 'Answer "what is {topic}?" in one sentence.' },
    ],
  },
  {
    id: 'memory-palace',
    name: 'Memory palace (loci and peg)',
    tagline: 'Attach each item in an ordered list to a place on a familiar route.',
    bestFor: 'Ordered lists: protocol steps, layers, sequences.',
    evidence: 'Strong',
    defaultMinutes: 20,
    runner: 'guided',
    steps: ['List the items', 'Pick a route', 'Place items', 'Walk it'],
    guide: [
      { title: 'List the items', prompt: 'List the items or steps in "{topic}" in order. Seven or fewer works best.' },
      { title: 'Pick a route', prompt: 'Choose a route you know well, such as five places in your home.' },
      { title: 'Place the items', prompt: 'Put one item at each place with a vivid, odd image.' },
      { title: 'Walk the route', prompt: 'Walk it in your head and say each item. Then walk it backwards and check against the note.' },
    ],
  },
  {
    id: 'worked-examples',
    name: 'Worked examples that fade',
    tagline: 'Study a full solution, then redo it with steps hidden, then with nothing.',
    bestFor: 'Maths, algorithms, SQL and code.',
    evidence: 'Good',
    defaultMinutes: 30,
    runner: 'guided',
    steps: ['Study a full solution', 'Redo hidden steps', 'Solve a new one', 'Log slips'],
    guide: [
      { title: 'Study a full solution', prompt: 'Read the worked solution for "{topic}" line by line and say why each step is there.' },
      { title: 'Redo the hard steps', prompt: 'Cover the steps you find hardest and redo them from memory.' },
      { title: 'Solve a new one', prompt: 'Solve a similar problem with nothing in front of you.' },
      { title: 'Log your slips', prompt: 'Compare with the solution. Write down each slip as a weak spot to revisit.' },
    ],
  },
];

export const METHOD_BY_ID: Record<MethodId, StudyMethod> = Object.fromEntries(
  STUDY_METHODS.map((m) => [m.id, m])
) as Record<MethodId, StudyMethod>;
