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

export const INITIAL_COURSES: Course[] = [
  // Year 1
  {
    id: 'c-cs101',
    code: 'CS101',
    name: 'Introduction to Systems & C',
    year: 1,
    semester: 1,
    color: '#3b82f6', // blue
    description: 'Foundations of memory layout, pointers, stack vs heap, and Unix basics.',
  },
  {
    id: 'c-cs102',
    code: 'CS102',
    name: 'Discrete Mathematics & Logic',
    year: 1,
    semester: 1,
    color: '#6366f1', // indigo
    description: 'Propositional logic, set theory, induction, graph theory basics.',
  },
  {
    id: 'c-cs103',
    code: 'CS103',
    name: 'Data Structures Foundations',
    year: 1,
    semester: 2,
    color: '#06b6d4', // cyan
    description: 'Arrays, linked lists, binary search trees, hash tables, Big-O.',
  },

  // Year 2
  {
    id: 'c-cs201',
    code: 'CS201',
    name: 'Operating Systems & Concurrency',
    year: 2,
    semester: 1,
    color: '#10b981', // emerald
    description: 'Threads, mutexes, semaphores, deadlocks, virtual memory and page tables.',
  },
  {
    id: 'c-cs202',
    code: 'CS202',
    name: 'Algorithms & Complexity',
    year: 2,
    semester: 2,
    color: '#84cc16', // lime
    description: 'Greedy algorithms, dynamic programming, Dijkstra, graph search, NP-completeness.',
  },

  // Year 3
  {
    id: 'c-cs301',
    code: 'CS301',
    name: 'Distributed Systems',
    year: 3,
    semester: 1,
    color: '#f59e0b', // amber
    description: 'Consensus protocols (Raft/Paxos), CAP theorem, vector clocks, RPCs.',
  },
  {
    id: 'c-cs302',
    code: 'CS302',
    name: 'Database Engine Internals',
    year: 3,
    semester: 2,
    color: '#f97316', // orange
    description: 'B+ Trees vs LSM trees, write-ahead logging (WAL), two-phase locking, query planning.',
  },

  // Year 4
  {
    id: 'c-cs401',
    code: 'CS401',
    name: 'Distributed Event Broker Capstone',
    year: 4,
    semester: 1,
    color: '#ec4899', // pink
    description: 'Designing and deploying a fault-tolerant log-structured event streaming broker.',
  },
  {
    id: 'c-cs402',
    code: 'CS402',
    name: 'Applied Cryptography & Security',
    year: 4,
    semester: 2,
    color: '#8b5cf6', // purple
    description: 'TLS 1.3 handshakes, constant-time algorithms, public key cryptosystems.',
  },
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

export const INITIAL_NOTES: Note[] = [
  // Year 1 Notes
  {
    id: 'note-y1-1',
    courseId: 'c-cs101',
    year: 1,
    title: 'Manual Memory Allocation & Pointer Arithmetic in C',
    content: `# Memory Segments and Pointer Arithmetic

Programs in C run inside an address space divided into:
1. **Text (Code)**: Read-only instructions.
2. **Data / BSS**: Global and static variables.
3. **Stack**: Automatically managed frame allocation for local variables. LIFO order.
4. **Heap**: Dynamic memory managed by the programmer via \`malloc\`, \`calloc\`, \`realloc\`, and \`free\`.

### Pointer Dereferencing & Offsets
Pointer arithmetic increments by the \`sizeof(type)\`:
\`\`\`c
int arr[5] = {10, 20, 30, 40, 50};
int *p = arr;
printf("%d\\n", *(p + 2)); // prints 30 (offset by 2 * 4 bytes)
\`\`\`

### Common Pitfalls
- **Dangling Pointers**: Accessing memory after calling \`free(p)\`.
- **Double Free**: Calling \`free()\` twice on the same memory chunk, corrupting the heap metadata allocator.
- **Memory Leaks**: Losing all references to heap-allocated memory without deallocating.`,
    summary: 'Core principles of stack vs heap, pointer arithmetic scaling with data type size, and heap lifecycle bugs.',
    tags: ['C', 'Memory', 'Pointers', 'Heap'],
    keyTakeaways: [
      'Stack is LIFO and auto-managed; heap is dynamic and requires explicit lifecycle control.',
      'Pointer addition p + 1 scales by sizeof(*p).',
      'Always set pointer to NULL after freeing to guard against accidental dangling dereferences.'
    ],
    createdAt: '2023-03-12T10:00:00Z',
    updatedAt: '2023-03-12T10:00:00Z',
    masteryScore: 92,
  },
  {
    id: 'note-y1-2',
    courseId: 'c-cs102',
    year: 1,
    title: 'Graph Theory Foundations & Spanning Trees',
    content: `# Graph Theory Basics

A graph $G = (V, E)$ consists of vertices $V$ and edges $E$.
- **Connected Graph**: A path exists between any two vertices.
- **Tree**: An undirected graph that is connected and acyclic.
- Properties of a tree with $n$ vertices:
  - Exactly $n - 1$ edges.
  - Adding any edge creates exactly one simple cycle.
  - Removing any edge disconnects the graph.

### Minimum Spanning Trees (MST)
For a connected weighted graph, an MST connects all vertices with minimal total edge weight without cycles.
- Kruskal's algorithm (Greedy, uses Disjoint-Set / Union-Find).
- Prim's algorithm (Greedy, grows from a source vertex using a priority queue).`,
    summary: 'Mathematical definition of trees as minimal connected graphs with n-1 edges and greedy MST approaches.',
    tags: ['Graph Theory', 'Trees', 'Discrete Math', 'MST'],
    keyTakeaways: [
      'A tree is a connected acyclic graph with n - 1 edges.',
      'Cut property: The minimum-weight edge crossing any cut (V1, V2) belongs to the MST.'
    ],
    createdAt: '2023-04-18T14:30:00Z',
    updatedAt: '2023-04-18T14:30:00Z',
    masteryScore: 88,
  },
  {
    id: 'note-y1-3',
    courseId: 'c-cs103',
    year: 1,
    title: 'Hash Tables, Collision Resolution & Amortized O(1)',
    content: `# Hash Tables & Load Factor

A hash table maps keys to values by running keys through a hash function $h(k) \\pmod m$.

### Collision Resolution Strategies
1. **Separate Chaining**: Each bucket holds a linked list or red-black tree. Degradation under high load: $O(1 + \\alpha)$, where $\\alpha = n/m$.
2. **Open Addressing**:
   - Linear Probing: $h(k, i) = (h(k) + i) \\pmod m$ (suffers from primary clustering).
   - Quadratic Probing: avoids primary clustering.
   - Double Hashing: $h(k, i) = (h_1(k) + i \\cdot h_2(k)) \\pmod m$.

### Rehashing & Dynamic Resizing
When $\\alpha > 0.75$, allocate a new table of size $2m$ and rehash all keys. This achieves amortized $O(1)$ insertions.`,
    summary: 'Hash functions, load factor management, collision strategies, and amortized complexity analysis.',
    tags: ['Data Structures', 'Hash Tables', 'Amortized Analysis', 'Complexity'],
    keyTakeaways: [
      'Load factor alpha = n/m dictates when to trigger resizing.',
      'Separate chaining gracefully degrades; open addressing requires careful tombstone markers on delete.'
    ],
    createdAt: '2023-09-05T09:15:00Z',
    updatedAt: '2023-09-05T09:15:00Z',
    masteryScore: 95,
  },

  // Year 2 Notes
  {
    id: 'note-y2-1',
    courseId: 'c-cs201',
    year: 2,
    title: 'Mutual Exclusion, Semaphores & Deadlock Coffman Conditions',
    content: `# Concurrency, Race Conditions & Locks

When multiple threads execute concurrently and share mutable state, race conditions occur if execution order is non-deterministic.

### Critical Section Problem
Requires:
1. **Mutual Exclusion**: Only one thread in the critical section at a time.
2. **Progress**: If no thread is in the critical section, selection cannot be postponed indefinitely.
3. **Bounded Waiting**: Bound on the number of times others enter after a thread requests entry.

### Semaphores vs Mutex
- **Mutex**: Binary lock with strict ownership (only the locking thread can unlock).
- **Counting Semaphore**: Has an integer value representing available units.
  - \`wait()\` / \`P()\`: decrements. If $< 0$, block.
  - \`signal()\` / \`V()\`: increments. Wakes up a waiter.

### Coffman Conditions for Deadlock
Deadlock occurs if and only if ALL four conditions hold:
1. Mutual Exclusion
2. Hold and Wait
3. No Preemption
4. Circular Wait (break this by global lock acquisition ordering!)`,
    summary: 'Synchronization primitives, critical section criteria, and breaking circular wait to avoid deadlocks.',
    tags: ['Concurrency', 'Operating Systems', 'Deadlocks', 'Semaphores', 'Locks'],
    keyTakeaways: [
      'Mutex implies ownership; semaphore is signaling between threads.',
      'To eliminate deadlocks: enforce a total ordering on lock acquisition to break circular wait.'
    ],
    createdAt: '2024-02-14T11:00:00Z',
    updatedAt: '2024-02-14T11:00:00Z',
    masteryScore: 89,
  },
  {
    id: 'note-y2-2',
    courseId: 'c-cs202',
    year: 2,
    title: 'Dynamic Programming: Optimal Substructure & Overlapping Subproblems',
    content: `# Dynamic Programming (DP)

DP solves optimization problems by decomposing them into smaller subproblems, caching the results to avoid redundant recomputation.

### Two Key Ingredients
1. **Optimal Substructure**: The optimal solution to the problem contains optimal solutions to subproblems.
2. **Overlapping Subproblems**: The same subproblems are solved repeatedly in a naive recursive breakdown.

### Example: Longest Common Subsequence (LCS)
State transition:
$$LCS(i, j) = \\begin{cases} 0 & \\text{if } i=0 \\text{ or } j=0 \\\\ 1 + LCS(i-1, j-1) & \\text{if } X[i] == Y[j] \\\\ \\max(LCS(i-1, j), LCS(i, j-1)) & \\text{otherwise} \\end{cases}$$

Memoization (top-down) vs Tabulation (bottom-up space-optimized).`,
    summary: 'DP state transitions, memoization vs tabulation, and identifying optimal substructure.',
    tags: ['Algorithms', 'Dynamic Programming', 'Complexity', 'Memoization'],
    keyTakeaways: [
      'Draw the DAG of subproblems to verify absence of circular dependencies.',
      'Space can often be reduced from O(n^2) to O(n) by only keeping the previous row/state.'
    ],
    createdAt: '2024-04-20T16:00:00Z',
    updatedAt: '2024-04-20T16:00:00Z',
    masteryScore: 78,
  },

  // Year 3 Notes
  {
    id: 'note-y3-1',
    courseId: 'c-cs301',
    year: 3,
    title: 'Raft Consensus Protocol & Distributed State Machine Replication',
    content: `# Raft Consensus Protocol

Raft is designed for understandability while providing equivalent safety to Multi-Paxos.
It maintains a replicated state machine across independent nodes.

### Three Sub-Problems
1. **Leader Election**:
   - Nodes transition between *Follower*, *Candidate*, and *Leader*.
   - Randomized election timeouts (150ms-300ms) prevent split votes.
   - A candidate must win a majority of votes ($> N/2$) to become leader.
2. **Log Replication**:
   - The leader accepts log entries from clients and broadcasts \`AppendEntries\` RPCs.
   - Once an entry is safely written to a majority of node logs, the leader commits it and applies it to the state machine.
3. **Safety Invariant**:
   - If a leader has committed an entry for a given term, that entry will be present in the logs of the leaders for all higher terms.
   - Leader Completeness is enforced at election time: voters deny votes if the candidate's log is less up-to-date than their own.

### Relationship to Year 2 Concurrency
In Year 2 CS201, mutual exclusion was achieved in a single address space using CPU atomic instructions (compare-and-swap) and mutex locks. In Distributed Systems, with no shared memory and unreliable network links, **Consensus is the distributed analogue of mutual exclusion**!`,
    summary: 'Raft consensus roles, randomized election timeouts, quorum log replication, and safety invariants.',
    tags: ['Distributed Systems', 'Consensus', 'Raft', 'Fault Tolerance', 'Replication'],
    keyTakeaways: [
      'Majority quorum (> N/2) guarantees that at least one node in any new election contains all committed entries.',
      'Log matching property: if two logs contain an entry with same index and term, they are identical up to that index.'
    ],
    createdAt: '2025-02-18T13:45:00Z',
    updatedAt: '2025-02-18T13:45:00Z',
    masteryScore: 91,
  },
  {
    id: 'note-y3-2',
    courseId: 'c-cs302',
    year: 3,
    title: 'Storage Engines: B+ Trees vs Log-Structured Merge (LSM) Trees',
    content: `# Storage Engines: Reads vs Writes

Modern database storage engines balance read latency against write throughput:

### 1. B+ Trees (e.g., PostgreSQL, InnoDB)
- Balanced tree on disk with page-sized nodes (usually 4KB or 16KB).
- Leaves form a doubly linked list for fast range scans.
- **Pros**: Fast point reads ($O(\\log_B N)$), excellent range scans.
- **Cons**: High write amplification; random I/O writes dirty pages in place.

### 2. LSM Trees (e.g., RocksDB, Cassandra)
- Writes go to an in-memory sorted skip-list (\`MemTable\`) and an append-only Write-Ahead Log (WAL).
- When \`MemTable\` is full, it is flushed to disk as an immutable \`SSTable\` (Sorted String Table).
- Periodic background **Compaction** merges overlapping SSTables and deletes tombstoned records.
- Uses **Bloom Filters** to check whether a key definitely does NOT exist in an SSTable before disk seek.
- **Pros**: High write throughput (sequential append writes), compact storage.
- **Cons**: Read amplification across multiple levels; background compaction can cause latency spikes.`,
    summary: 'Architectural trade-offs between B+ Trees (read-optimized in-place update) and LSM Trees (write-optimized append-only).',
    tags: ['Databases', 'Storage Engines', 'B+ Trees', 'LSM Trees', 'Compaction'],
    keyTakeaways: [
      'B+ Trees minimize read latency with random page writes.',
      'LSM Trees optimize write throughput via sequential I/O, using Bloom Filters and multi-level compaction for reads.'
    ],
    createdAt: '2025-04-10T15:20:00Z',
    updatedAt: '2025-04-10T15:20:00Z',
    masteryScore: 86,
  },

  // Year 4 Notes
  {
    id: 'note-y4-1',
    courseId: 'c-cs401',
    year: 4,
    title: 'Capstone: High-Throughput Event Broker Architecture & Zero-Copy I/O',
    content: `# Distributed Event Broker Architecture (Capstone)

Building a fault-tolerant log streaming broker capable of handling 500,000 msgs/sec with low tail latency.

### Core Architectural Decisions
1. **Append-Only Commit Log**:
   - Each partition is an append-only segment on disk.
   - Sequential disk writes achieve speeds comparable to memory bus bandwidth on modern NVMe drives.
2. **Zero-Copy Network Transfer**:
   - Using Linux \`sendfile()\` system call to transfer data directly from the OS page cache to the network socket descriptor.
   - Completely avoids copying data into user-space buffers, drastically reducing CPU context switches and memory bus pressure.
   - *Direct link to Year 1 CS101 & Year 2 CS201*: Relies on kernel page cache management and direct DMA transfer.
3. **Partitioned Ordering & Consumer Groups**:
   - Strict FIFO ordering is guaranteed within a single partition.
   - Partitions allow horizontal scale-out across cluster worker nodes.`,
    summary: 'Capstone event broker implementation using append-only disk segments, Linux sendfile() zero-copy I/O, and consumer group balancing.',
    tags: ['Capstone', 'Streaming', 'Zero-Copy', 'Operating Systems', 'Performance'],
    keyTakeaways: [
      'sendfile() eliminates user-space context switches by streaming from page cache directly to NIC buffer.',
      'Partitioning decouples global scalability from per-key strict total ordering.'
    ],
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z',
    masteryScore: 96,
  },
  {
    id: 'note-y4-2',
    courseId: 'c-cs402',
    year: 4,
    title: 'TLS 1.3 Handshake & Diffie-Hellman Key Exchange',
    content: `# Modern Cryptography & TLS 1.3

TLS 1.3 removed obsolete cryptographic primitives (RSA key exchange, CBC ciphers, RC4) and reduced connection latency from 2-RTT to 1-RTT.

### Ephemeral Elliptic Curve Diffie-Hellman (ECDHE)
Provides **Forward Secrecy**: even if the server's long-term private key is compromised in the future, past recorded sessions cannot be decrypted.
1. Client generates private scalar $a$ and public curve point $A = a \\cdot G$.
2. Server generates private scalar $b$ and public curve point $B = b \\cdot G$.
3. Both compute shared secret:
   $$K = a \\cdot B = b \\cdot A = (a \\cdot b) \\cdot G$$
4. Key derivation function (HKDF) derives symmetric encryption keys for ChaCha20-Poly1305 or AES-GCM.

### Side-Channel Defenses
Must write constant-time arithmetic for modular addition and scalar multiplication to eliminate timing attacks that leak secret exponents.`,
    summary: 'TLS 1.3 1-RTT handshake, ECDHE forward secrecy mechanism, and constant-time implementation requirements.',
    tags: ['Cryptography', 'Security', 'TLS', 'Networking'],
    keyTakeaways: [
      'Forward secrecy relies on ephemeral keys generated per session.',
      'Timing attacks leak private keys if branch execution depends on secret bits.'
    ],
    createdAt: '2026-04-12T11:30:00Z',
    updatedAt: '2026-04-12T11:30:00Z',
    masteryScore: 84,
  },
  {
    id: 'note-y1-4',
    courseId: 'c-cs101',
    year: 1,
    title: 'Unix shell, pipes and file permissions',
    content: `Every command reads stdin and writes stdout, so \`|\` chains small tools into a pipeline. \`grep error log.txt | sort | uniq -c\` counts repeated errors. Permissions are three triples (owner, group, others) of read, write and execute, so \`chmod 640 file\` gives the owner read and write, the group read, others nothing.`,
    summary: 'Pipes connect stdout to stdin; permissions are owner, group and others.',
    tags: ['Unix', 'Shell', 'Pipes', 'Permissions'],
    keyTakeaways: ['Small tools plus pipes beat one big script.', 'chmod 640 means rw-, r--, ---.'],
    createdAt: '2023-10-09T10:00:00.000Z',
    updatedAt: '2023-10-09T10:00:00.000Z',
    masteryScore: 74,
  },
  {
    id: 'note-y1-5',
    courseId: 'c-cs102',
    year: 1,
    title: 'Proof by induction',
    content: `To prove a claim for every n: show the base case, then show that if it holds for k it holds for k+1. Example: the sum 1+2+...+n equals n(n+1)/2. Base n=1 gives 1. Assume it for k, add k+1, and the algebra gives (k+1)(k+2)/2. Induction is the same shape as recursion, which is why it keeps coming back.`,
    summary: 'Base case plus inductive step proves a claim for all n; same shape as recursion.',
    tags: ['Induction', 'Proofs', 'Recursion'],
    keyTakeaways: ['Always state the induction hypothesis out loud.', 'Base case first, or the proof proves nothing.'],
    createdAt: '2023-11-14T10:00:00.000Z',
    updatedAt: '2023-11-14T10:00:00.000Z',
    masteryScore: 81,
  },
  {
    id: 'note-y1-6',
    courseId: 'c-cs103',
    year: 1,
    title: 'Big-O in plain words',
    content: `Big-O describes how running time grows as input grows, ignoring constants. O(1) constant, O(log n) halving each step like binary search, O(n) one pass, O(n log n) good sorting, O(n^2) a loop inside a loop. A hash table lookup is O(1) on average but O(n) in the worst case when everything collides.`,
    summary: 'Growth rate of running time: O(1), O(log n), O(n), O(n log n), O(n^2).',
    tags: ['Big-O', 'Complexity', 'Hash tables'],
    keyTakeaways: ['Halving the problem each step gives log n.', 'Average case and worst case can differ.'],
    createdAt: '2024-02-20T10:00:00.000Z',
    updatedAt: '2024-02-20T10:00:00.000Z',
    masteryScore: 88,
  },
  {
    id: 'note-y2-3',
    courseId: 'c-cs201',
    year: 2,
    title: 'Virtual memory and paging',
    content: `Each process sees a private address space split into fixed-size pages. The page table maps virtual pages to physical frames, and the TLB caches recent translations. Touching a page that is not in memory raises a page fault, the OS loads it from disk, and the instruction retries. Thrashing is when the working set does not fit and the system spends its time faulting.`,
    summary: 'Page tables map virtual to physical memory; page faults load from disk; thrashing is too many faults.',
    tags: ['Paging', 'TLB', 'Page fault', 'Virtual memory'],
    keyTakeaways: ['TLB hits make translation almost free.', 'Thrashing means the working set exceeds RAM.'],
    createdAt: '2024-10-08T10:00:00.000Z',
    updatedAt: '2024-10-08T10:00:00.000Z',
    masteryScore: 79,
  },
  {
    id: 'note-y2-4',
    courseId: 'c-cs201',
    year: 2,
    title: 'CPU scheduling: round robin vs MLFQ',
    content: `Round robin gives each process a fixed time slice and rotates, which is fair but ignores that some jobs are short. A multi-level feedback queue starts every job at high priority and demotes it if it uses its whole slice, so short interactive jobs finish quickly while long CPU-bound jobs sink. Priority boosts every so often stop starvation.`,
    summary: 'Round robin is fair but blind; MLFQ demotes long jobs and boosts to avoid starvation.',
    tags: ['Scheduling', 'MLFQ', 'Round robin', 'Starvation'],
    keyTakeaways: ['MLFQ learns which jobs are short by watching them.', 'Periodic boosts prevent starvation.'],
    createdAt: '2024-11-12T10:00:00.000Z',
    updatedAt: '2024-11-12T10:00:00.000Z',
    masteryScore: 72,
  },
  {
    id: 'note-y2-5',
    courseId: 'c-cs202',
    year: 2,
    title: 'Graph traversal: BFS vs DFS',
    content: `BFS uses a queue and visits nodes level by level, so on an unweighted graph it finds the shortest path. DFS uses a stack, or recursion, and goes deep first, which suits cycle detection and topological sort. Both run in O(V + E). Mark nodes visited when you enqueue them, not when you dequeue, or you will enqueue duplicates.`,
    summary: 'BFS finds shortest paths with a queue; DFS goes deep with a stack; both O(V+E).',
    tags: ['Graphs', 'BFS', 'DFS', 'Queue'],
    keyTakeaways: ['BFS for shortest path, DFS for cycles and ordering.', 'Mark visited on enqueue.'],
    createdAt: '2025-02-18T10:00:00.000Z',
    updatedAt: '2025-02-18T10:00:00.000Z',
    masteryScore: 85,
  },
  {
    id: 'note-y3-3',
    courseId: 'c-cs301',
    year: 3,
    title: 'Consistency models and the CAP theorem',
    content: `During a network partition a system must choose: stay consistent and refuse some requests, or stay available and risk stale reads. Strong consistency means every read sees the latest write. Eventual consistency means replicas converge if writes stop. Raft chooses consistency, which is why a minority partition cannot accept writes.`,
    summary: 'Under partition you pick consistency or availability; Raft picks consistency.',
    tags: ['CAP', 'Consistency', 'Partition', 'Raft'],
    keyTakeaways: ['CAP only bites during a partition.', 'A minority partition in Raft cannot commit.'],
    createdAt: '2025-10-14T10:00:00.000Z',
    updatedAt: '2025-10-14T10:00:00.000Z',
    masteryScore: 77,
  },
  {
    id: 'note-y3-4',
    courseId: 'c-cs302',
    year: 3,
    title: 'Isolation levels and MVCC',
    content: `Isolation levels trade safety for speed: read committed stops dirty reads, repeatable read also stops non-repeatable reads, serializable behaves as if transactions ran one at a time. MVCC keeps several versions of each row and gives every transaction a snapshot, so readers never block writers. Old versions are cleaned up later by vacuum.`,
    summary: 'MVCC gives each transaction a snapshot, so readers never block writers.',
    tags: ['MVCC', 'Isolation', 'Transactions', 'Snapshots'],
    keyTakeaways: ['Higher isolation costs more conflicts.', 'Dead row versions need vacuuming.'],
    createdAt: '2025-11-18T10:00:00.000Z',
    updatedAt: '2025-11-18T10:00:00.000Z',
    masteryScore: 70,
  },
  {
    id: 'note-y3-5',
    courseId: 'c-cs302',
    year: 3,
    title: 'Two-phase commit and its blocking problem',
    content: `A coordinator asks every participant to prepare, and only if all vote yes does it tell them to commit. If the coordinator crashes after participants voted yes, they cannot decide alone and stay blocked holding locks. Consensus protocols such as Raft replace the single coordinator with a replicated group, which removes that single point of failure.`,
    summary: '2PC blocks if the coordinator dies after the prepare vote.',
    tags: ['2PC', 'Transactions', 'Coordinator', 'Locks'],
    keyTakeaways: ['Prepared participants must wait for the coordinator.', 'Replicating the coordinator removes the blocking.'],
    createdAt: '2026-02-10T10:00:00.000Z',
    updatedAt: '2026-02-10T10:00:00.000Z',
    masteryScore: 64,
  },
  {
    id: 'note-y4-3',
    courseId: 'c-cs401',
    year: 4,
    title: 'Backpressure and flow control in streaming systems',
    content: `When a producer is faster than a consumer the buffer grows until memory runs out. Backpressure pushes that pressure back upstream: bounded queues block or reject producers, and credit-based flow control lets a consumer grant a number of messages at a time. Dropping messages is a policy decision, not a bug, and must be explicit.`,
    summary: 'Bounded queues and credits push pressure upstream instead of buffering forever.',
    tags: ['Backpressure', 'Streaming', 'Queues', 'Flow control'],
    keyTakeaways: ['Unbounded buffers only delay the crash.', 'Decide explicitly when to drop.'],
    createdAt: '2026-08-20T10:00:00.000Z',
    updatedAt: '2026-08-20T10:00:00.000Z',
    masteryScore: 83,
  },
  {
    id: 'note-y4-4',
    courseId: 'c-cs402',
    year: 4,
    title: 'TLS 1.3 handshake in one round trip',
    content: `The client sends its key share in the first message, so the server can answer with its own share, the certificate and a Finished message straight away. Both sides derive keys after one round trip. Older versions needed two. Resumption with a pre-shared key allows 0-RTT data, which can be replayed, so it is only safe for idempotent requests.`,
    summary: 'TLS 1.3 needs one round trip; 0-RTT resumption is replayable.',
    tags: ['TLS', 'Handshake', 'Key exchange', '0-RTT'],
    keyTakeaways: ['Key share goes in the ClientHello.', 'Only send idempotent requests as 0-RTT.'],
    createdAt: '2026-09-25T10:00:00.000Z',
    updatedAt: '2026-09-25T10:00:00.000Z',
    masteryScore: 76,
  },
];

export const INITIAL_PROFILE: LearningProfile = {
  studentName: 'Alex Chimwaza',
  degreeName: 'B.Sc. in Computer Science',
  university: 'University of Engineering & Technology',
  currentYear: 4,
  explanationStyle: 'code-first',
  answerLength: 'balanced',
  socraticPacing: false,
  codeLanguagePreference: 'C / Rust / TypeScript',
  strengths: [
    'Memory management & systems programming',
    'Distributed consensus & state machines',
    'Data structure algorithmic complexity',
    'Low-level network I/O optimization'
  ],
  weakTopics: [
    {
      topic: 'Dynamic Programming State Formulation',
      courseCode: 'CS202',
      year: 2,
      masteryLevel: 68,
      needsRevisit: true,
      lastReviewed: '2026-02-10',
      confidenceScore: 0.65,
    },
    {
      topic: 'LSM Compaction Latency Spikes',
      courseCode: 'CS302',
      year: 3,
      masteryLevel: 74,
      needsRevisit: true,
      lastReviewed: '2026-03-15',
      confidenceScore: 0.72,
    },
    {
      topic: 'Elliptic Curve Side-Channel Resistance',
      courseCode: 'CS402',
      year: 4,
      masteryLevel: 79,
      needsRevisit: false,
      lastReviewed: '2026-04-01',
      confidenceScore: 0.81,
    },
  ],
  memoryLogs: [
    {
      id: 'log-1',
      timestamp: '2026-04-14 14:22',
      trigger: 'Clicked "Show code example" after concurrency explanation',
      insight: 'Prefers concrete implementation snippets over mathematical formal proofs.',
      category: 'style',
      confidence: 0.95,
      isActive: true,
    },
    {
      id: 'log-2',
      timestamp: '2026-04-10 09:15',
      trigger: 'Follow-up question on Raft safety vs Dijkstra semaphores',
      insight: 'Excels when new distributed concepts are anchored to Year 1/2 operating systems foundations.',
      category: 'strength',
      confidence: 0.91,
      isActive: true,
    },
    {
      id: 'log-3',
      timestamp: '2026-03-28 17:40',
      trigger: 'Flagged "Too long" on dynamic programming derivation',
      insight: 'Prefers state-transition recurrence relations directly followed by the space-optimized tabular loop.',
      category: 'habit',
      confidence: 0.88,
      isActive: true,
    },
    {
      id: 'log-4',
      timestamp: '2026-02-15 11:05',
      trigger: 'Hesitation on SuperMemo review for B+ tree interior page layout',
      insight: 'Flagged LSM vs B+ Tree trade-offs as a high-yield revisit topic for upcoming interviews.',
      category: 'weakness',
      confidence: 0.82,
      isActive: true,
    },
    {
      id: 'log-5',
      timestamp: '2026-10-12 21:10',
      trigger: 'Rated three answers "Just right" after step-by-step explanations',
      insight: 'Learns operating systems topics best as a numbered sequence of what the kernel does.',
      category: 'style',
      confidence: 0.9,
      isActive: true,
    },
    {
      id: 'log-6',
      timestamp: '2026-10-09 16:30',
      trigger: 'Marked two-phase commit as lost',
      insight: 'Gets stuck when transaction topics are explained without a failure scenario first.',
      category: 'weakness',
      confidence: 0.8,
      isActive: true,
    },
    {
      id: 'log-7',
      timestamp: '2026-10-03 08:45',
      trigger: 'Reviewed flashcards before 09:00 on four separate days',
      insight: 'Retains more in short morning review sessions than in evening cramming.',
      category: 'habit',
      confidence: 0.86,
      isActive: true,
    },
    {
      id: 'log-8',
      timestamp: '2026-09-27 19:20',
      trigger: 'Asked how TLS 1.3 compares to Year 2 networking notes',
      insight: 'Connects new security material back to earlier networking notes unprompted.',
      category: 'strength',
      confidence: 0.84,
      isActive: true,
    },
  ],
  totalQuestionsAsked: 187,
  studyStreaksDays: 19,
  preferredStudyTime: 'Late Morning (10:00 - 13:00)',
};

export const INITIAL_FLASHCARDS: Flashcard[] = [
  {
    id: 'fc-1',
    noteId: 'note-y1-1',
    courseCode: 'CS101',
    year: 1,
    front: 'Why does pointer arithmetic `p + 2` in C increment the memory address by 8 bytes if `p` is an `int*`?',
    back: 'Pointer arithmetic automatically scales by the size of the pointed-to type: `sizeof(int)` is 4 bytes, so `+ 2` increments the raw virtual address by 2 * 4 = 8 bytes.',
    interval: 14,
    repetition: 4,
    easeFactor: 2.5,
    dueDate: '2026-10-20',
    lastReviewed: '2026-10-06',
    status: 'mastered',
  },
  {
    id: 'fc-2',
    noteId: 'note-y2-1',
    courseCode: 'CS201',
    year: 2,
    front: 'What are the 4 Coffman conditions required for a deadlock to occur?',
    back: '1. Mutual Exclusion\n2. Hold and Wait\n3. No Preemption\n4. Circular Wait (can be eliminated via strict total lock hierarchy).',
    interval: 8,
    repetition: 3,
    easeFactor: 2.4,
    dueDate: '2026-10-18',
    lastReviewed: '2026-10-10',
    status: 'learning',
  },
  {
    id: 'fc-3',
    noteId: 'note-y3-1',
    courseCode: 'CS301',
    year: 3,
    front: 'In the Raft consensus algorithm, how does randomized election timeout prevent split-vote deadlocks?',
    back: 'By staggering election timeouts (e.g. 150ms-300ms), one candidate node almost always times out first, requests votes, and gathers a majority before rival followers wake up to compete.',
    interval: 12,
    repetition: 4,
    easeFactor: 2.6,
    dueDate: '2026-10-22',
    lastReviewed: '2026-10-10',
    status: 'mastered',
  },
  {
    id: 'fc-4',
    noteId: 'note-y3-2',
    courseCode: 'CS302',
    year: 3,
    front: 'Why do LSM trees achieve significantly higher write throughput than B+ trees?',
    back: 'LSM trees convert random disk updates into sequential append-only writes (first to memory MemTable & append-only WAL, then flushed as immutable SSTables), avoiding random in-place disk page modification.',
    interval: 5,
    repetition: 2,
    easeFactor: 2.3,
    dueDate: '2026-10-19',
    lastReviewed: '2026-10-14',
    status: 'learning',
  },
  {
    id: 'fc-5',
    noteId: 'note-y4-1',
    courseCode: 'CS401',
    year: 4,
    front: 'How does the `sendfile()` system call achieve Zero-Copy data transfer in high-throughput network brokers?',
    back: 'It transfers data directly from the kernel OS page cache buffer to the network socket buffer without copying payload bytes into user-space application memory, cutting context switches and memory bus bottlenecks.',
    interval: 6,
    repetition: 3,
    easeFactor: 2.5,
    dueDate: '2026-10-21',
    lastReviewed: '2026-10-15',
    status: 'mastered',
  },
  {
    id: 'fc-s1',
    noteId: 'note-y1-4',
    courseCode: 'CS101',
    year: 1,
    front: 'What does `chmod 640 file` allow?',
    back: 'Owner can read and write, group can read, everyone else gets no access (rw-, r--, ---).',
    interval: 21,
    repetition: 5,
    easeFactor: 2.55,
    lastReviewed: '2026-10-16',
    dueDate: '2026-11-05',
    status: 'mastered',
  },
  {
    id: 'fc-s2',
    noteId: 'note-y1-5',
    courseCode: 'CS102',
    year: 1,
    front: 'What are the two parts of a proof by induction?',
    back: 'The base case, then the inductive step: assume the claim for k and prove it for k+1.',
    interval: 18,
    repetition: 4,
    easeFactor: 2.45,
    lastReviewed: '2026-10-15',
    dueDate: '2026-11-02',
    status: 'mastered',
  },
  {
    id: 'fc-s3',
    noteId: 'note-y1-6',
    courseCode: 'CS103',
    year: 1,
    front: 'Why is binary search O(log n)?',
    back: 'Each comparison halves the remaining range, so n items need about log2(n) steps.',
    interval: 16,
    repetition: 4,
    easeFactor: 2.45,
    lastReviewed: '2026-10-15',
    dueDate: '2026-10-30',
    status: 'mastered',
  },
  {
    id: 'fc-s4',
    noteId: 'note-y2-3',
    courseCode: 'CS201',
    year: 2,
    front: 'What happens on a page fault?',
    back: 'The OS finds the page on disk, loads it into a free frame, updates the page table, and retries the instruction.',
    interval: 6,
    repetition: 2,
    easeFactor: 2.55,
    lastReviewed: '2026-10-16',
    dueDate: '2026-10-19',
    status: 'learning',
  },
  {
    id: 'fc-s5',
    noteId: 'note-y2-4',
    courseCode: 'CS201',
    year: 2,
    front: 'How does MLFQ avoid starving jobs?',
    back: 'It demotes jobs that use a full time slice, and periodically boosts everything back to the top queue.',
    interval: 4,
    repetition: 2,
    easeFactor: 2.55,
    lastReviewed: '2026-10-16',
    dueDate: '2026-10-18',
    status: 'learning',
  },
  {
    id: 'fc-s6',
    noteId: 'note-y2-5',
    courseCode: 'CS202',
    year: 2,
    front: 'Why mark a node visited when enqueuing in BFS rather than when dequeuing?',
    back: 'Otherwise the same node can be enqueued many times before it is processed, wasting time and breaking the O(V+E) bound.',
    interval: 3,
    repetition: 1,
    easeFactor: 2.45,
    lastReviewed: '2026-10-15',
    dueDate: '2026-10-18',
    status: 'learning',
  },
  {
    id: 'fc-s7',
    noteId: 'note-y3-3',
    courseCode: 'CS301',
    year: 3,
    front: 'Under a network partition, what does Raft give up?',
    back: 'Availability on the minority side: it cannot commit writes without a majority, which keeps the data consistent.',
    interval: 5,
    repetition: 2,
    easeFactor: 2.55,
    lastReviewed: '2026-10-16',
    dueDate: '2026-10-20',
    status: 'learning',
  },
  {
    id: 'fc-s8',
    noteId: 'note-y3-4',
    courseCode: 'CS302',
    year: 3,
    front: 'Why do readers not block writers under MVCC?',
    back: 'Each transaction reads its own snapshot of older row versions, while writers create new versions.',
    interval: 1,
    repetition: 0,
    easeFactor: 2.35,
    dueDate: '2026-10-18',
    status: 'new',
  },
  {
    id: 'fc-s9',
    noteId: 'note-y3-5',
    courseCode: 'CS302',
    year: 3,
    front: 'Why can two-phase commit block?',
    back: 'If the coordinator crashes after participants voted yes, they cannot commit or abort alone and keep holding locks.',
    interval: 1,
    repetition: 0,
    easeFactor: 2.35,
    dueDate: '2026-10-18',
    status: 'new',
  },
  {
    id: 'fc-s10',
    noteId: 'note-y4-3',
    courseCode: 'CS401',
    year: 4,
    front: 'Name two ways to apply backpressure.',
    back: 'Bounded queues that block or reject producers, and credit-based flow control where consumers grant a number of messages.',
    interval: 1,
    repetition: 0,
    easeFactor: 2.35,
    dueDate: '2026-10-18',
    status: 'new',
  },
  {
    id: 'fc-s11',
    noteId: 'note-y4-4',
    courseCode: 'CS402',
    year: 4,
    front: 'Why is TLS 1.3 0-RTT data risky?',
    back: 'It can be replayed by an attacker, so it should only carry idempotent requests.',
    interval: 1,
    repetition: 0,
    easeFactor: 2.35,
    dueDate: '2026-10-19',
    status: 'new',
  },
];

export const INITIAL_SKILLS: PortfolioSkill[] = [
  {
    name: 'Systems Programming & C',
    category: 'Languages',
    level: 'Expert',
    firstAcquiredYear: 1,
    evidenceNotes: [
      { noteId: 'note-y1-1', courseCode: 'CS101', title: 'Manual Memory Allocation & Pointer Arithmetic in C' },
      { noteId: 'note-y2-1', courseCode: 'CS201', title: 'Mutual Exclusion, Semaphores & Deadlock Coffman Conditions' }
    ]
  },
  {
    name: 'Distributed Systems & Consensus (Raft)',
    category: 'Systems',
    level: 'Advanced',
    firstAcquiredYear: 3,
    evidenceNotes: [
      { noteId: 'note-y3-1', courseCode: 'CS301', title: 'Raft Consensus Protocol & Distributed State Machine Replication' }
    ]
  },
  {
    name: 'Storage Engines (LSM & B+ Trees)',
    category: 'Systems',
    level: 'Advanced',
    firstAcquiredYear: 3,
    evidenceNotes: [
      { noteId: 'note-y3-2', courseCode: 'CS302', title: 'Storage Engines: B+ Trees vs LSM Trees' }
    ]
  },
  {
    name: 'High-Performance Zero-Copy I/O',
    category: 'Tools & Cloud',
    level: 'Advanced',
    firstAcquiredYear: 4,
    evidenceNotes: [
      { noteId: 'note-y4-1', courseCode: 'CS401', title: 'Capstone: High-Throughput Event Broker Architecture' }
    ]
  },
  {
    name: 'Modern Cryptography (TLS 1.3 & ECDHE)',
    category: 'Theory',
    level: 'Proficient',
    firstAcquiredYear: 4,
    evidenceNotes: [
      { noteId: 'note-y4-2', courseCode: 'CS402', title: 'TLS 1.3 Handshake & Diffie-Hellman Key Exchange' }
    ]
  },
  {
    name: 'Data Structures & Dynamic Programming',
    category: 'Algorithms',
    level: 'Proficient',
    firstAcquiredYear: 1,
    evidenceNotes: [
      { noteId: 'note-y1-3', courseCode: 'CS103', title: 'Hash Tables, Collision Resolution & Amortized O(1)' },
      { noteId: 'note-y2-2', courseCode: 'CS202', title: 'Dynamic Programming: Optimal Substructure' }
    ]
  }
];

export const INITIAL_PROJECTS: PortfolioProject[] = [
  {
    id: 'proj-1',
    title: 'TitanBroker: Distributed Log-Structured Streaming Engine',
    year: 4,
    courseCode: 'CS401',
    description: 'A fault-tolerant distributed event broker inspired by Kafka, written with zero-copy socket transfers and segmented append-only disk storage.',
    technologies: ['C/C++', 'Linux Epoll', 'sendfile()', 'POSIX Threads', 'Protobuf'],
    outcomes: [
      'Processed 420,000 messages/sec with sub-millisecond p99 delivery latency.',
      'Implemented custom Raft leader election and log replication across 5-node cluster.',
      'Reduced memory footprint by 64% through direct kernel page cache DMA.'
    ],
    githubUrl: 'https://github.com/alexchimwaza/titan-broker',
  },
  {
    id: 'proj-2',
    title: 'KestrelDB: LSM-Tree Key-Value Store',
    year: 3,
    courseCode: 'CS302',
    description: 'An embedded key-value storage engine featuring MemTable write buffering, write-ahead logging (WAL), multi-level SSTable compaction, and Bloom filters.',
    technologies: ['Rust', 'Bloom Filters', 'SSTables', 'Concurrent SkipList'],
    outcomes: [
      'Achieved 85MB/s sustained write throughput on NVMe SSDs.',
      'Reduced false-positive disk read queries to under 1% with custom 10-bit Bloom filter implementation.'
    ],
    githubUrl: 'https://github.com/alexchimwaza/kestreldb',
  },
  {
    id: 'proj-3',
    title: 'MicroOS: Preemptive Multitasking Kernel & Userland Shell',
    year: 2,
    courseCode: 'CS201',
    description: 'A lightweight x86 OS kernel featuring preemptive round-robin scheduling, demand paging, and a custom userland shell with IPC pipes.',
    technologies: ['C', 'x86 Assembly', 'QEMU', 'GDB'],
    outcomes: [
      'Handled hardware interrupts (PIT timer, keyboard IRQ1) and memory segmentation.',
      'Implemented copy-on-write fork() virtual memory semantics.'
    ],
    githubUrl: 'https://github.com/alexchimwaza/micro-os',
  }
];

export const INITIAL_SENIOR_COMMENTS: SeniorComment[] = [
  {
    id: 'sc-1',
    courseCode: 'CS201',
    topic: 'Deadlocks & Coffman Conditions',
    authorName: 'Tariq Al-Mansoor',
    authorGrade: 'A+',
    semesterCleared: 'Fall 2024',
    category: 'exam-gotcha',
    commentText: '⚠️ Midterm 2 Alert: Prof almost always provides a complex Resource Allocation Graph and asks if it is deadlocked. Remember: a cycle in a single-instance graph GUARANTEES deadlock, but in a multi-instance graph a cycle is only NECESSARY, not sufficient! Practice reduction algorithms.',
    upvotes: 48,
    hasUpvoted: false,
    verifiedClearance: true,
    createdAt: '2025-01-15T10:00:00Z',
  },
  {
    id: 'sc-2',
    courseCode: 'CS201',
    topic: 'Virtual Memory & Page Replacement',
    authorName: 'Alex Chimwaza',
    authorGrade: 'A+',
    semesterCleared: 'Fall 2024',
    category: 'study-strategy',
    commentText: '💡 Do not just memorize LRU and Clock page replacement algorithms. Write a 50-line C simulation of the Clock algorithm with a circular buffer and reference bits. It was literally Question 4 on the final exam.',
    upvotes: 36,
    hasUpvoted: false,
    verifiedClearance: true,
    createdAt: '2025-01-20T14:30:00Z',
  },
  {
    id: 'sc-3',
    courseCode: 'CS101',
    topic: 'Pointer Arithmetic & Heap Lifecycle',
    authorName: 'Nadia Osei',
    authorGrade: 'A',
    semesterCleared: 'Spring 2023',
    category: 'exam-gotcha',
    commentText: 'Watch out for operator precedence! `*p++` dereferences `p` first and then increments the pointer, whereas `(*p)++` increments the value pointed to. This distinction appeared in 3 different multiple-choice questions.',
    upvotes: 62,
    hasUpvoted: false,
    verifiedClearance: true,
    createdAt: '2024-05-10T09:15:00Z',
  },
  {
    id: 'sc-4',
    courseCode: 'CS301',
    topic: 'Raft Consensus & Log Compaction',
    authorName: 'Marcus Vance',
    authorGrade: 'A+',
    semesterCleared: 'Fall 2025',
    category: 'resource-gem',
    commentText: '🔥 Use the secret visualization tool at raft.github.io before writing a single line of Lab 2. The hardest part is understanding what happens when a leader crashes immediately after sending AppendEntries but before committing.',
    upvotes: 89,
    hasUpvoted: false,
    verifiedClearance: true,
    createdAt: '2025-11-04T16:20:00Z',
  },
  {
    id: 'sc-5',
    courseCode: 'CS302',
    topic: 'LSM Compaction vs B+ Trees',
    authorName: 'Elena Rostova',
    authorGrade: 'A',
    semesterCleared: 'Spring 2025',
    category: 'lecturer-quirk',
    commentText: 'Dr. Henderson loves asking: "If write amplification is high, why did RocksDB choose LSM over B+ Trees?" Answer in terms of sequential NVMe write endurance and memory bus throughput, not just Big-O!',
    upvotes: 41,
    hasUpvoted: false,
    verifiedClearance: true,
    createdAt: '2025-06-01T11:45:00Z',
  },
];

export const INITIAL_STUDY_BLUEPRINTS: StudyBlueprint[] = [
  {
    id: 'bp-cs201-alex',
    studentName: 'Alex Chimwaza',
    studentTier: 'A+',
    archetype: 'Consistent Daily Architect',
    courseCode: 'CS201',
    courseName: 'Operating Systems & Concurrency',
    overallGpa: '3.94 / 4.0',
    weeklyHours: 7,
    pacingStrategy: 'Daily 1-hour active implementation block. Never cram threading labs over weekends.',
    examPrepDaysBefore: 16,
    flashcardReviewCadence: 'Daily 15-minute spaced recall during morning commute (10:00 AM)',
    summaryQuote: 'OS is an engineering course masquerading as theory. If you code the synchronization primitives from scratch in C, the theoretical proofs become trivial.',
    recommendedHabits: [
      'Compile code with `-Wall -Wextra -pthread -fsanitize=thread` from Day 1.',
      'Spend 30 minutes drawing lock hierarchy graphs before touching your keyboard.',
      'Review flashcards for Coffman conditions 3 times per week to prevent decay.',
    ],
    syllabusMilestones: [
      {
        week: 1,
        topic: 'Process Lifecycle & fork()',
        focus: 'Understand copy-on-write page tables and PID management.',
        workloadHours: 6,
        proTip: 'Write a tiny shell with fork() and execvp() in week 1; gives you a 2-week head start.',
      },
      {
        week: 4,
        topic: 'Concurrency & Race Conditions',
        focus: 'Peterson’s algorithm, atomic test-and-set, mutex locks.',
        workloadHours: 8,
        proTip: 'Intentionally trigger a data race with 10 threads incrementing a shared counter without locks.',
      },
      {
        week: 7,
        topic: 'Deadlocks & Coffman Conditions',
        focus: 'Resource allocation graphs, Banker’s algorithm, circular wait.',
        workloadHours: 9,
        proTip: 'Practice Banker’s algorithm tables with matrix subtraction (Max - Allocation).',
      },
      {
        week: 11,
        topic: 'Virtual Memory & Page Replacement',
        focus: 'Page tables, TLB hits/misses, Clock algorithm, Belady’s anomaly.',
        workloadHours: 7,
        proTip: 'Understand why FIFO replacement suffers from Belady’s anomaly while Stack algorithms do not.',
      },
    ],
    adoptedByCount: 38,
    isAdopted: true,
  },
  {
    id: 'bp-cs301-marcus',
    studentName: 'Marcus Vance',
    studentTier: 'A+',
    archetype: 'First-Principles Deep Diver',
    courseCode: 'CS301',
    courseName: 'Distributed Systems',
    overallGpa: '3.98 / 4.0',
    weeklyHours: 9,
    pacingStrategy: 'Paper reading on Tuesdays, protocol whiteboard walkthrough on Thursdays, weekend test harness execution.',
    examPrepDaysBefore: 18,
    flashcardReviewCadence: '4 times per week; focused on consensus safety invariants',
    summaryQuote: 'You cannot debug distributed systems by stepping through with a debugger. You must internalize state machines and log invariants.',
    recommendedHabits: [
      'Read the Raft paper twice: once for the happy path, once exclusively for network partition recovery.',
      'Never write distributed algorithms without randomized latency fault-injection tests.',
      'Adopt the "Ask Grove" conceptual link queries to connect Raft leader election back to OS mutexes.',
    ],
    syllabusMilestones: [
      {
        week: 2,
        topic: 'RPCs & Network Partitions',
        focus: 'At-least-once vs exactly-once semantics, idempotency keys.',
        workloadHours: 7,
        proTip: 'Always design network payloads with monotonic sequence numbers.',
      },
      {
        week: 5,
        topic: 'Logical Clocks & Vector Clocks',
        focus: 'Lamport timestamps, partial ordering, causal consistency.',
        workloadHours: 8,
        proTip: 'Vector clocks grow with the number of nodes; remember the memory trade-off.',
      },
      {
        week: 9,
        topic: 'Raft Consensus Engine',
        focus: 'Leader election timeouts, log matching property, joint consensus.',
        workloadHours: 12,
        proTip: 'Stagger node election timeouts between 150ms and 300ms to eliminate split votes.',
      },
      {
        week: 13,
        topic: 'Distributed Transactions & 2PC',
        focus: 'Two-phase commit, coordinator crash failure modes, Paxos commit.',
        workloadHours: 9,
        proTip: 'Memorize the coordinator blocking state during Phase 2.',
      },
    ],
    adoptedByCount: 52,
    isAdopted: false,
  },
  {
    id: 'bp-cs101-nadia',
    studentName: 'Nadia Osei',
    studentTier: 'A',
    archetype: 'Active Recall Specialist',
    courseCode: 'CS101',
    courseName: 'Introduction to Systems & C',
    overallGpa: '3.82 / 4.0',
    weeklyHours: 5,
    pacingStrategy: 'High-frequency flashcard drilling paired with Valgrind memory leak checks on all homework.',
    examPrepDaysBefore: 12,
    flashcardReviewCadence: 'Daily 10-minute micro-drills on pointer dereferencing and bitwise masks',
    summaryQuote: 'Freshmen fail C because they try to understand it like Python. C is about memory addresses, offsets, and bytes.',
    recommendedHabits: [
      'Draw stack frames with pencil and paper for every function call with pointer arguments.',
      'Run `valgrind --leak-check=full` on every single assignment before submitting.',
      'Keep a personal "Gotcha Journal" of compiler warnings that cost you time.',
    ],
    syllabusMilestones: [
      {
        week: 2,
        topic: 'Data Types & Bitwise Arithmetic',
        focus: 'Two’s complement, bit shifts (<< and >>), bitmasks.',
        workloadHours: 5,
        proTip: 'Always remember: right-shifting a signed negative integer performs arithmetic shift (sign-extends).',
      },
      {
        week: 6,
        topic: 'Pointers & Pointer Arithmetic',
        focus: 'Address-of operator &, dereference *, scaling by sizeof.',
        workloadHours: 6,
        proTip: 'Draw a grid of 4-byte boxes when doing array indexing via pointers.',
      },
      {
        week: 10,
        topic: 'Dynamic Memory & Structs',
        focus: 'malloc, free, struct padding and memory alignment.',
        workloadHours: 6,
        proTip: 'Order struct fields from largest to smallest to minimize memory padding bytes.',
      },
    ],
    adoptedByCount: 64,
    isAdopted: false,
  },
];

export const INITIAL_TUTORS: TutorProfile[] = [
  {
    id: 'tutor-1',
    name: 'Alex Chimwaza',
    currentYear: 4,
    degreeName: 'B.Sc. Computer Science',
    clearedCourses: [
      { courseCode: 'CS101', courseName: 'Systems & C', grade: 'A+', yearCleared: 2023 },
      { courseCode: 'CS201', courseName: 'Operating Systems & Concurrency', grade: 'A+', yearCleared: 2024 },
      { courseCode: 'CS301', courseName: 'Distributed Systems', grade: 'A+', yearCleared: 2025 },
      { courseCode: 'CS302', courseName: 'Database Internals', grade: 'A', yearCleared: 2025 },
    ],
    bio: 'Final-year systems student and creator of TitanBroker event streaming engine. I specialize in breaking down difficult low-level concurrency, virtual memory, and consensus protocols with code-first diagrams.',
    explanationStyle: 'code-first',
    rating: 4.96,
    sessionsDelivered: 28,
    hourlyRate: 'Free / Cohort Volunteer',
    available: true,
    preferredContact: 'alex.chimwaza@campus.edu',
  },
  {
    id: 'tutor-2',
    name: 'Tariq Al-Mansoor',
    currentYear: 4,
    degreeName: 'B.Sc. Computer Science & Math',
    clearedCourses: [
      { courseCode: 'CS102', courseName: 'Discrete Mathematics', grade: 'A+', yearCleared: 2023 },
      { courseCode: 'CS201', courseName: 'Operating Systems', grade: 'A+', yearCleared: 2024 },
      { courseCode: 'CS202', courseName: 'Algorithms & Complexity', grade: 'A+', yearCleared: 2024 },
    ],
    bio: 'Passionate about algorithmic proofs, dynamic programming, and OS deadlock conditions. I help students transition from panic to structured mathematical intuition.',
    explanationStyle: 'first-principles',
    rating: 4.92,
    sessionsDelivered: 34,
    hourlyRate: '$15 / hr',
    available: true,
    preferredContact: 'tariq.mansoor@campus.edu',
  },
  {
    id: 'tutor-3',
    name: 'Nadia Osei',
    currentYear: 3,
    degreeName: 'B.Sc. Software Engineering',
    clearedCourses: [
      { courseCode: 'CS101', courseName: 'Systems & C', grade: 'A', yearCleared: 2024 },
      { courseCode: 'CS103', courseName: 'Data Structures Foundations', grade: 'A+', yearCleared: 2024 },
      { courseCode: 'CS202', courseName: 'Algorithms & Complexity', grade: 'A', yearCleared: 2025 },
    ],
    bio: 'Dedicated to helping Year 1 and 2 students conquer C pointer confusion, Big-O analysis, and tree balancing. High-energy, supportive, and active-recall focused.',
    explanationStyle: 'analogies',
    rating: 4.88,
    sessionsDelivered: 19,
    hourlyRate: 'Free / Cohort Volunteer',
    available: true,
    preferredContact: 'nadia.osei@campus.edu',
  },
];

export const INITIAL_TUTOR_REQUESTS: TutorRequest[] = [
  {
    id: 'req-1',
    requesterName: 'Kelvin Banda',
    requesterYear: 2,
    tutorId: 'tutor-1',
    tutorName: 'Alex Chimwaza',
    courseCode: 'CS201',
    topic: 'Deadlock avoidance & Coffman circular wait in Project 2',
    message: 'Hey Alex! I have been reading your notes in Grove on mutexes vs semaphores. I am struggling with the dining philosophers test case in Lab 2. Could we do a 30-min walkthrough?',
    preferredTime: 'Thursday 15:00 - 17:00 (Campus Library or Discord)',
    urgency: 'midterm-prep',
    status: 'pending',
    createdAt: '2026-10-16T14:20:00Z',
  },
  {
    id: 'req-2',
    requesterName: 'Chileshe Mumba',
    requesterYear: 1,
    tutorId: 'tutor-3',
    tutorName: 'Nadia Osei',
    courseCode: 'CS101',
    topic: 'Pointer Arithmetic & Memory Leaks with Valgrind',
    message: 'Hi Nadia, I saw your comment on CS101 operator precedence. My assignment 3 is segfaulting on double pointers (`char**`). Would really appreciate your guidance!',
    preferredTime: 'Saturday morning 10:00 AM',
    urgency: 'assignment-deadline',
    status: 'accepted',
    createdAt: '2026-10-15T09:30:00Z',
  },
];
