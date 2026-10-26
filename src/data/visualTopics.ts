import { ECON_TOPICS, type EconTopicId } from './econVisuals';
import { BIT_TOPICS, type BitTopicId } from './bitVisuals';
import { canSee } from '../services/access';

/** Everything the Visuals tab needs: animations (HyperFrames compositions), written notes, quizzes, and the course map. */

export interface VisualStep {
  title: string;
  text: string;
  /** Seconds into the animation where this step starts and ends. */
  t0: number;
  t1: number;
}

export interface ChoiceQuestion {
  q: string;
  options: string[];
  answer: number;
  why: string;
  /** Step to replay after the student answers. */
  step: number;
}

export interface TopicNotes {
  summary: string;
  ideas: string[];
  table: { heading: [string, string, string]; rows: [string, string, string][] };
  useWhen: string[];
  watchOut: string[];
}

export type TopicId = 'cpu' | 'stack-queue' | 'linked-list' | 'bst' | 'hash-table' | EconTopicId | BitTopicId;

export interface VisualTopic {
  id: TopicId;
  group: 'Computer systems' | 'Data structures' | 'Economics' | 'Big data and warehousing';
  /** Only students whose ID starts with this prefix see it (e.g. 'BIT'). */
  audience?: string;
  /** The lecture unit it belongs to, shown under the title. */
  unit?: string;
  name: string;
  courseCode: string;
  src: string;
  steps: VisualStep[];
  notes: TopicNotes;
  /** Multiple-choice questions. The CPU uses click-the-part questions instead. */
  quiz: ChoiceQuestion[];
}

const even = (titles: [string, string][], each: number): VisualStep[] =>
  titles.map(([title, text], i) => ({ title, text, t0: i * each, t1: (i + 1) * each }));

const BASE_TOPICS: VisualTopic[] = [
  {
    id: 'cpu',
    group: 'Computer systems',
    name: 'How a CPU runs an instruction',
    courseCode: 'CS101',
    src: 'visuals/cpu/index.html',
    steps: even(
      [
        ['Fetch', 'The Program Counter holds the address of the next instruction and sends it to memory.'],
        ['Memory answers', 'RAM looks up that address and sends the instruction back into the CPU.'],
        ['Decode', 'The Control Unit reads the instruction and works out what to do.'],
        ['Execute', 'The ALU does the arithmetic on values fetched from the registers.'],
        ['Write back', 'The result is stored in a register and the Program Counter moves on.'],
      ],
      3
    ),
    notes: {
      summary:
        'A CPU repeats one loop billions of times a second: fetch an instruction, decode it, execute it, store the result. Programs are just long lists of these instructions sitting in memory.',
      ideas: [
        'Instructions live in RAM, the same place as data. The CPU copies the one it needs next.',
        'The Program Counter (PC) always holds the address of the next instruction. It moves on by one after each.',
        'Registers are tiny, very fast slots inside the CPU. The ALU works on values held there.',
        'Clock speed is how many of these cycles happen each second.',
      ],
      table: {
        heading: ['Part', 'Job', 'Speed'],
        rows: [
          ['Registers', 'Hold the values being worked on right now', 'Fastest'],
          ['ALU', 'Arithmetic and comparisons', 'One step per cycle'],
          ['Control Unit', 'Decodes instructions and directs the rest', 'One step per cycle'],
          ['RAM', 'Holds the whole running program and its data', 'Much slower than registers'],
        ],
      },
      useWhen: ['You need to explain why cache and registers matter for performance.', 'You are reading assembly and want to follow what each line does to the registers.'],
      watchOut: ['The Program Counter changes after fetch, so a jump instruction works by overwriting it.', 'Real CPUs overlap these steps (pipelining). This animation shows one instruction at a time.'],
    },
    quiz: [],
  },
  {
    id: 'stack-queue',
    group: 'Data structures',
    name: 'Stack and queue',
    courseCode: 'CS103',
    src: 'visuals/stack-queue/index.html',
    steps: even(
      [
        ['Push', 'A stack adds items on top. Push A, then B, then C.'],
        ['Pop', 'Pop removes the newest item. C was last in, so C is first out.'],
        ['Enqueue', 'A queue adds items at the back. Enqueue A, then B, then C.'],
        ['Dequeue', 'Dequeue removes the oldest item. A was first in, so A is first out.'],
        ['Compare', 'Same items, opposite order: stack is LIFO, queue is FIFO.'],
      ],
      3
    ),
    notes: {
      summary:
        'Both hold a sequence of items and only let you touch the ends. A stack serves the newest item first (LIFO). A queue serves the oldest item first (FIFO).',
      ideas: [
        'Stack: push and pop at the same end, the top. Last in, first out.',
        'Queue: enqueue at the back, dequeue at the front. First in, first out.',
        'Either can be built on an array or a linked list.',
        'You never search the middle. That restriction is what makes the operations cheap.',
      ],
      table: {
        heading: ['Operation', 'Cost', 'Why'],
        rows: [
          ['push / pop', 'O(1)', 'Only the top changes'],
          ['enqueue / dequeue', 'O(1)', 'Only the ends change (with a linked list or circular array)'],
          ['peek', 'O(1)', 'Look at the top or front without removing it'],
          ['search', 'O(n)', 'You would have to remove items to reach the middle'],
        ],
      },
      useWhen: [
        'Stack: undo history, matching brackets, the function call stack, depth-first search.',
        'Queue: print jobs, tasks waiting for a CPU, breadth-first search, messages in order.',
      ],
      watchOut: [
        'Popping an empty stack (underflow) is a classic bug. Check before you pop.',
        'A queue built on a plain array that shifts every item on dequeue costs O(n). Use a circular buffer or a linked list.',
        'Very deep recursion fills the call stack and causes a stack overflow.',
      ],
    },
    quiz: [
      { q: 'You push 1, 2, 3 onto a stack and pop once. Which value comes out?', options: ['1', '2', '3', 'It depends'], answer: 2, why: 'A stack is last in, first out. 3 went in last, so it comes out first.', step: 1 },
      { q: 'Which of these behaves like a stack?', options: ['The undo history in an editor', 'People waiting at a bank', 'A shuffled playlist', 'A phone book'], answer: 0, why: 'Undo reverses the most recent action first, which is last in, first out.', step: 0 },
      { q: 'A queue receives A, B, C in that order. What does dequeue return?', options: ['A', 'B', 'C', 'All three'], answer: 0, why: 'A queue is first in, first out. A arrived first, so it leaves first.', step: 3 },
      { q: 'Print jobs should be handled in the order they arrive. Which structure fits?', options: ['Stack', 'Queue', 'Binary tree', 'Hash table'], answer: 1, why: 'A queue keeps arrival order: the oldest job is served first.', step: 2 },
    ],
  },
  {
    id: 'linked-list',
    group: 'Data structures',
    name: 'Linked list',
    courseCode: 'CS103',
    src: 'visuals/linked-list/index.html',
    steps: even(
      [
        ['Traverse', 'Start at the head and follow each next pointer. Finding 9 takes 3 hops.'],
        ['Insert 5 after 3', 'Point the new node at 9, then point 3 at it. Only two pointers change.'],
        ['Delete the head', 'Move the head to the next node. Node 7 becomes unreachable.'],
        ['Why it matters', 'Lists are quick to change but slow to look up. Arrays are the opposite.'],
      ],
      4
    ),
    notes: {
      summary:
        'A linked list stores each value in a node together with a pointer to the next node. Nodes can sit anywhere in memory, so changing the list means changing pointers, not moving data.',
      ideas: [
        'The list is only reachable through its head pointer. Lose the head and you lose the list.',
        'The last node points to null.',
        'A doubly linked list also keeps a pointer back to the previous node, which makes deleting a known node easy.',
        'Each node costs extra memory for its pointer, and nodes spread across memory are slower to read than an array.',
      ],
      table: {
        heading: ['Operation', 'Cost', 'Why'],
        rows: [
          ['Access item k', 'O(n)', 'Walk from the head, one hop at a time'],
          ['Search', 'O(n)', 'Same walk, comparing as you go'],
          ['Insert at the head', 'O(1)', 'New node points at the old head, then head moves'],
          ['Insert after a known node', 'O(1)', 'Change two pointers'],
          ['Delete the head', 'O(1)', 'Move the head pointer on'],
        ],
      },
      useWhen: ['You insert and delete in the middle a lot and rarely index by position.', 'You are building stacks, queues or chains inside a hash table.'],
      watchOut: [
        'Order matters when rewiring: set the new node’s next pointer first, then change the previous node. Do it the other way and you lose the rest of the list.',
        'Always handle an empty list and the last node (null) before you follow a pointer.',
      ],
    },
    quiz: [
      { q: 'Why is inserting in the middle of a linked list quick?', options: ['Only a couple of pointers change', 'Items shift along automatically', 'The list is kept sorted', 'It uses a hash function'], answer: 0, why: 'You create the node and re-point two links. No other node moves.', step: 1 },
      { q: 'Finding the 5th item in a linked list costs…', options: ['O(1)', 'O(n)', 'O(log n)', 'O(n²)'], answer: 1, why: 'There is no index. You walk from the head, hop by hop.', step: 0 },
      { q: 'You delete the head node. What must happen?', options: ['The head pointer moves to the next node', 'Every node shifts left', 'The tail is deleted too', 'Nothing, the list fixes itself'], answer: 0, why: 'The head pointer must move on, otherwise the list still starts at a removed node.', step: 2 },
    ],
  },
  {
    id: 'bst',
    group: 'Data structures',
    name: 'Binary search tree',
    courseCode: 'CS103',
    src: 'visuals/bst/index.html',
    steps: even(
      [
        ['Build the tree', 'Smaller values go left, larger values go right. Insert 8, 3, then 10.'],
        ['Insert more', 'Each new value walks down from the root: compare, go left or right, repeat.'],
        ['Search for 6', 'Every comparison throws away half the tree: 3 steps instead of checking all 6.'],
        ['Read in order', 'Visiting left, then node, then right gives the values sorted.'],
      ],
      4
    ),
    notes: {
      summary:
        'A binary search tree keeps values in order: everything in a node’s left subtree is smaller, everything in its right subtree is larger. That rule lets you skip half the remaining tree at every step.',
      ideas: [
        'Search, insert and delete all walk down from the root, so their cost is the height of the tree.',
        'A balanced tree has height about log₂ n, so a million values need about 20 comparisons.',
        'In-order traversal (left, node, right) visits the values in sorted order.',
        'Self-balancing trees (AVL, red-black) rotate nodes to keep the height small.',
      ],
      table: {
        heading: ['Operation', 'Balanced', 'Worst case'],
        rows: [
          ['Search', 'O(log n)', 'O(n)'],
          ['Insert', 'O(log n)', 'O(n)'],
          ['Delete', 'O(log n)', 'O(n)'],
          ['In-order traversal', 'O(n)', 'O(n)'],
        ],
      },
      useWhen: ['You need fast lookups and also need the data in sorted order.', 'You need range queries such as "all values between 10 and 50".'],
      watchOut: [
        'Inserting already-sorted values (1, 2, 3, 4…) builds a lopsided chain, and every operation becomes O(n).',
        'Deleting a node with two children needs care: replace it with its in-order successor first.',
      ],
    },
    quiz: [
      { q: 'In a binary search tree, where does a value smaller than the current node go?', options: ['Left subtree', 'Right subtree', 'Back to the root', 'It replaces the node'], answer: 0, why: 'Smaller goes left, larger goes right. That is the whole ordering rule.', step: 0 },
      { q: 'Searching for 6 in the tree shown compares it with which values?', options: ['8, 3, 6', '1, 3, 6', '8, 10, 14', 'All six values'], answer: 0, why: '6 is smaller than 8 (go left), larger than 3 (go right), then it matches 6.', step: 2 },
      { q: 'Reading a binary search tree in order (left, node, right) gives…', options: ['Sorted values', 'Reverse order', 'Insertion order', 'Random order'], answer: 0, why: 'Because smaller values are on the left and larger on the right, in-order visits them ascending.', step: 3 },
      { q: 'You insert 1, 2, 3, 4, 5 in that order. What shape is the tree?', options: ['A lopsided chain', 'Perfectly balanced', 'A heap', 'Empty'], answer: 0, why: 'Each value is larger than the last, so it always goes right. Searching then costs O(n), which is why balanced trees exist.', step: 1 },
    ],
  },
  {
    id: 'hash-table',
    group: 'Data structures',
    name: 'Hash table',
    courseCode: 'CS103',
    src: 'visuals/hash-table/index.html',
    steps: even(
      [
        ['Hash the key', 'A hash function turns the key into a bucket number. "Ada" becomes 3.'],
        ['Insert another', '"Bob" hashes to 5, so it goes straight into bucket 5.'],
        ['Collision', '"Eve" also hashes to 3. Chaining links it after Ada in the same bucket.'],
        ['Look up Eve', 'Hash to bucket 3, then walk the short chain until the key matches.'],
      ],
      4
    ),
    notes: {
      summary:
        'A hash table stores key-value pairs in an array. A hash function turns each key into an index, so you jump straight to where the value lives instead of searching for it.',
      ideas: [
        'index = hash(key) mod m, where m is the number of buckets.',
        'Two keys can land in the same bucket. That is a collision, and every real table must handle it.',
        'Chaining keeps a small list in each bucket. Open addressing probes for the next free slot.',
        'The load factor α = n / m measures how full the table is. Resize and rehash when it passes about 0.75.',
      ],
      table: {
        heading: ['Operation', 'Average', 'Worst case'],
        rows: [
          ['Insert', 'O(1)', 'O(n)'],
          ['Lookup', 'O(1)', 'O(n)'],
          ['Delete', 'O(1)', 'O(n)'],
          ['Iterate in key order', 'Not supported', 'Sort separately'],
        ],
      },
      useWhen: ['You look things up by key: usernames, caches, counting words, removing duplicates.', 'Order does not matter, speed does.'],
      watchOut: [
        'A poor hash function sends many keys to few buckets and the average cost collapses toward O(n).',
        'Keys must not change after insertion, or their hash changes and the entry is lost.',
        'Resizing is expensive when it happens, but rare enough that inserts are still O(1) amortised.',
      ],
    },
    quiz: [
      { q: 'What does a hash function produce?', options: ['A bucket number for the key', 'A sorted list', 'A copy of the value', 'A pointer to the head'], answer: 0, why: 'It maps a key to an index in the array of buckets.', step: 0 },
      { q: 'Two different keys hash to the same bucket. This is called…', options: ['A collision', 'A rehash', 'An overflow', 'A rotation'], answer: 0, why: 'Collisions are normal. Chaining and open addressing are the two common ways to handle them.', step: 2 },
      { q: 'On average, looking up a key in a hash table costs…', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], answer: 0, why: 'Hash, jump to the bucket, check a very short chain.', step: 3 },
      { q: 'Why does a hash table resize when it gets too full?', options: ['To keep the chains short', 'To sort the keys', 'To save memory', 'To remove duplicates'], answer: 0, why: 'A lower load factor means fewer collisions, so lookups stay near O(1).', step: 2 },
    ],
  },
];

export const VISUAL_TOPICS: VisualTopic[] = [...BASE_TOPICS, ...ECON_TOPICS, ...BIT_TOPICS];

export const TOPIC_BY_ID = Object.fromEntries(VISUAL_TOPICS.map((t) => [t.id, t])) as Record<TopicId, VisualTopic>;

/** Click-the-part layout for the CPU animation (positions in the 1280x720 composition). */
export const CPU_PARTS = [
  { id: 'pc', name: 'Program Counter (PC)', x: 70, y: 170, w: 150, h: 86, step: 0, text: 'Holds the address of the next instruction. After each instruction it moves on by one.' },
  { id: 'mar', name: 'Memory Address Register (MAR)', x: 290, y: 170, w: 150, h: 86, step: 0, text: 'Holds the address the CPU is about to read from memory, so RAM knows which row to answer.' },
  { id: 'ir', name: 'Instruction Register (IR)', x: 290, y: 290, w: 290, h: 86, step: 1, text: 'Holds the instruction that was just fetched while it is decoded and run.' },
  { id: 'cu', name: 'Control Unit', x: 290, y: 410, w: 250, h: 120, step: 2, text: 'Reads the instruction, works out what it means, and tells the other parts what to do.' },
  { id: 'alu', name: 'ALU', x: 580, y: 410, w: 230, h: 120, step: 3, text: 'The Arithmetic Logic Unit. It does the maths (add, subtract) and the comparisons (equal, greater than).' },
  { id: 'reg', name: 'Registers', x: 70, y: 410, w: 180, h: 150, step: 3, text: 'A few tiny, very fast storage slots inside the CPU. The ALU works on values held here.' },
  { id: 'ram', name: 'RAM (memory)', x: 880, y: 128, w: 360, h: 482, step: 1, text: 'Stores the program and its data while it runs. Much bigger than the registers, but slower to reach.' },
] as const;

export type CpuPartId = (typeof CPU_PARTS)[number]['id'];

export const CPU_PART_QUIZ: { q: string; answer: CpuPartId; why: string }[] = [
  { q: 'Click the part that holds the address of the next instruction.', answer: 'pc', why: 'The Program Counter always points at the next instruction to fetch.' },
  { q: 'Click the part that does the arithmetic.', answer: 'alu', why: 'The ALU performs the maths and comparisons.' },
  { q: 'Click the part that stores the program while it runs.', answer: 'ram', why: 'RAM holds the program and its data. The CPU fetches from it.' },
  { q: 'Click the part that works out what an instruction means.', answer: 'cu', why: 'The Control Unit decodes the instruction and directs the others.' },
  { q: 'Click the part that holds the instruction being run right now.', answer: 'ir', why: 'The Instruction Register holds it during decode and execute.' },
  { q: 'Click the part with tiny, very fast slots holding values like 2 and 3.', answer: 'reg', why: 'Registers sit inside the CPU, so the ALU can reach them at once.' },
];

/** Which earlier courses each course builds on. Used for the programme map. */
export const BUILDS_ON: Record<string, string[]> = {
  CS101: [],
  CS102: [],
  CS103: ['CS101'],
  CS201: ['CS101'],
  CS202: ['CS102', 'CS103'],
  CS301: ['CS201'],
  CS302: ['CS202', 'CS103'],
  CS401: ['CS301', 'CS302'],
  CS402: ['CS201', 'CS301'],
  ECF110: [],
  BIT353: [],
};

export const VISUALS_FOR_COURSE = (code: string): VisualTopic[] => VISUAL_TOPICS.filter((t) => t.courseCode === code && canSee(t.audience));
