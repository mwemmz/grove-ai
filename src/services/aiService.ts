import { Note, LearningProfile, AcademicYear, MemoryLogEntry, StudentTier } from '../types';
import { storage } from './storage';

export interface AIResponsePayload {
  text: string;
  citedNotes: {
    noteId: string;
    courseCode: string;
    year: AcademicYear;
    title: string;
    relevanceQuote: string;
  }[];
  yearConnections: {
    earlierYear: AcademicYear;
    earlierCourse: string;
    earlierTopic: string;
    connectionText: string;
  }[];
  seniorTips?: {
    authorName: string;
    authorGrade: StudentTier;
    courseCode: string;
    tip: string;
  }[];
  appliedProfileAttributes: string[];
}


export const aiService = {
  /**
   * Search notes for relevance against a user query
   */
  findRelevantNotes(query: string, allNotes: Note[]): { note: Note; score: number }[] {
    const q = query.toLowerCase();
    const queryTokens = q.split(/\W+/).filter(t => t.length > 2);

    const scored = allNotes.map(note => {
      let score = 0;
      const titleLower = note.title.toLowerCase();
      const contentLower = note.content.toLowerCase();
      const tagsLower = note.tags.map(t => t.toLowerCase());

      queryTokens.forEach(token => {
        if (titleLower.includes(token)) score += 10;
        if (tagsLower.some(t => t.includes(token))) score += 8;
        if (contentLower.includes(token)) score += 3;
      });

      // Special thematic matches
      if ((q.includes('consensus') || q.includes('raft') || q.includes('mutex') || q.includes('lock')) &&
          (note.tags.includes('Consensus') || note.tags.includes('Concurrency') || note.tags.includes('Locks'))) {
        score += 15;
      }
      if ((q.includes('storage') || q.includes('lsm') || q.includes('b+ tree') || q.includes('database')) &&
          (note.tags.includes('Databases') || note.tags.includes('Storage Engines'))) {
        score += 15;
      }
      if ((q.includes('memory') || q.includes('pointer') || q.includes('zero-copy') || q.includes('sendfile')) &&
          (note.tags.includes('Memory') || note.tags.includes('Zero-Copy') || note.tags.includes('C'))) {
        score += 15;
      }

      return { note, score };
    });

    return scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);
  },

  /**
   * Detect conceptual connections across academic years
   */
  findCrossYearConnections(relevantNotes: Note[]): AIResponsePayload['yearConnections'] {
    const connections: AIResponsePayload['yearConnections'] = [];

    const hasYear1Notes = relevantNotes.some(n => n.year === 1);
    const hasYear2Notes = relevantNotes.some(n => n.year === 2);
    const hasYear3Notes = relevantNotes.some(n => n.year === 3);
    const hasYear4Notes = relevantNotes.some(n => n.year === 4);

    // Concurrency / Consensus bridge (Year 2 CS201 -> Year 3 CS301)
    if ((hasYear3Notes || hasYear4Notes) && !hasYear2Notes) {
      const touchesDistributed = relevantNotes.some(n => n.tags.includes('Consensus') || n.tags.includes('Distributed Systems') || n.title.includes('Raft'));
      if (touchesDistributed) {
        connections.push({
          earlierYear: 2,
          earlierCourse: 'CS201',
          earlierTopic: 'Mutual Exclusion & Locks',
          connectionText: 'In Year 2 CS201, you solved race conditions in single-machine shared memory using hardware compare-and-swap and mutexes. Raft consensus is the exact mathematical equivalent for distributed systems with no shared memory and unreliable clocks.'
        });
      }
    }

    // Zero-Copy / Memory bridge (Year 1 CS101 -> Year 4 CS401)
    if (hasYear4Notes || relevantNotes.some(n => n.tags.includes('Zero-Copy') || n.tags.includes('Streaming'))) {
      connections.push({
        earlierYear: 1,
        earlierCourse: 'CS101',
        earlierTopic: 'Manual Memory Layout & Heap Allocations',
        connectionText: 'In Year 1 CS101, you manually mapped heap vs stack addresses in C. Capstone zero-copy transfers via sendfile() work by keeping data strictly inside the kernel page cache buffer, bypassing application user-space memory entirely.'
      });
    }

    // Storage / Hash Table bridge (Year 1 CS103 -> Year 3 CS302)
    if (relevantNotes.some(n => n.tags.includes('Databases') || n.tags.includes('Storage Engines') || n.title.includes('LSM'))) {
      connections.push({
        earlierYear: 1,
        earlierCourse: 'CS103',
        earlierTopic: 'Hash Tables & Amortized O(1)',
        connectionText: 'In Year 1 CS103, you studied amortized time during dynamic table resizing. LSM trees apply this exact principle to disk I/O: by buffering writes in memory and performing amortized background compactions, writes stay blazing fast.'
      });
    }

    return connections;
  },

  /**
   * Primary query function: adapts to student profile and synthesizes answer
   */
  async askGrove(
    question: string,
    allNotes: Note[],
    profile: LearningProfile
  ): Promise<AIResponsePayload> {
    const qLower = question.toLowerCase();
    const relevant = this.findRelevantNotes(question, allNotes);
    const topNotes = relevant.slice(0, 3).map(r => r.note);
    const connections = this.findCrossYearConnections(topNotes.length > 0 ? topNotes : allNotes);

    const citedNotes = topNotes.map(n => ({
      noteId: n.id,
      courseCode: n.courseId.replace('c-', '').toUpperCase(),
      year: n.year,
      title: n.title,
      relevanceQuote: n.keyTakeaways[0] || n.summary,
    }));

    // Retrieve matching senior tips from students who cleared the course
    const allSeniorComments = storage.getSeniorComments();
    const matchingSeniorTips = allSeniorComments
      .filter(sc => {
        const cCode = sc.courseCode.toLowerCase();
        const top = sc.topic.toLowerCase();
        return qLower.includes(cCode) || 
               topNotes.some(n => n.courseId.toLowerCase().includes(cCode)) || 
               qLower.includes(top) ||
               sc.commentText.toLowerCase().includes(qLower.slice(0, 15));
      })
      .slice(0, 2)
      .map(sc => ({
        authorName: sc.authorName,
        authorGrade: sc.authorGrade,
        courseCode: sc.courseCode,
        tip: sc.commentText,
      }));

    const appliedAttributes: string[] = [
      `Style: ${profile.explanationStyle}`,
      `Density: ${profile.answerLength}`,
    ];

    if (profile.socraticPacing) appliedAttributes.push('Socratic pacing enabled');
    if (matchingSeniorTips.length > 0) appliedAttributes.push(`${matchingSeniorTips.length} Senior Clearance Advice integrated`);

    // Check if query is explicitly asking about learning history
    const isHistoryQuery = 
      qLower.includes('where did i first learn') || 
      qLower.includes('how did i learn') || 
      qLower.includes('timeline') || 
      qLower.includes('when did we cover');

    if (isHistoryQuery) {
      const resp = this.generateTimelineResponse(question, allNotes, profile, citedNotes, connections, appliedAttributes);
      resp.seniorTips = matchingSeniorTips;
      return resp;
    }

    // Default intelligent synthesized answer adapted to user style
    const resp = this.generateAdaptiveResponse(question, topNotes, profile, citedNotes, connections, appliedAttributes);
    resp.seniorTips = matchingSeniorTips;
    return resp;
  },

  generateTimelineResponse(
    question: string,
    allNotes: Note[],
    _profile: LearningProfile,
    citedNotes: AIResponsePayload['citedNotes'],
    connections: AIResponsePayload['yearConnections'],
    appliedAttributes: string[]
  ): AIResponsePayload {
    return {
      text: `### 🌲 Your Degree-Long Learning Lineage

Here is the chronological evolution of this concept throughout your 4-year degree:

1. **Year 1 — Foundational Building Blocks (CS101 / CS103)**:
   You were first introduced to manual memory layouts and pointer arithmetic. You analyzed why dereferencing an offset depends on \`sizeof(type)\` and how the CPU manages memory access.

2. **Year 2 — Local Concurrency & Resource Contention (CS201)**:
   In Operating Systems, this evolved into synchronizing multiple threads accessing shared memory. You proved deadlock prevention using the **4 Coffman conditions** and implemented mutexes and counting semaphores.

3. **Year 3 — Breaking the Single-Machine Boundary (CS301 / CS302)**:
   You moved beyond shared memory. When clocks and RAM are not shared, mutual exclusion transforms into **Consensus (Raft/Paxos)** and storage splits into **LSM vs B+ Trees**.

4. **Year 4 — Production Capstone & Zero-Copy Architecture (CS401)**:
   In your Capstone project, you unified all four years: streaming 500k msgs/sec using Linux \`sendfile()\` zero-copy I/O and partitioned commit logs.

> **Grove Insight**: You first struggled with pointers in Year 1, but by Year 4 you built a production zero-copy broker that completely circumvents userland memory buffers. That is a 4-year leap in systems maturity!`,
      citedNotes,
      yearConnections: connections,
      appliedProfileAttributes: [...appliedAttributes, 'Chronological Lineage Mode'],
    };
  },

  generateAdaptiveResponse(
    question: string,
    notes: Note[],
    profile: LearningProfile,
    citedNotes: AIResponsePayload['citedNotes'],
    connections: AIResponsePayload['yearConnections'],
    appliedAttributes: string[]
  ): AIResponsePayload {
    const style = profile.explanationStyle;
    const length = profile.answerLength;

    let responseBody = '';

    if (style === 'code-first') {
      responseBody = `### Direct Implementation & Technical Analysis

\`\`\`c
// High-efficiency kernel buffer transfer (Zero-Copy Sendfile)
#include <sys/sendfile.h>

ssize_t stream_to_socket(int out_socket_fd, int in_file_fd, off_t *offset, size_t count) {
    // Directly pushes pages from OS page cache into socket descriptor
    // Bypasses userspace memory copy entirely!
    return sendfile(out_socket_fd, in_file_fd, offset, count);
}
\`\`\`

#### Key Mechanics:
1. **DMA Transfer**: Disk controller transfers bytes directly to kernel page cache via DMA.
2. **Descriptor Hand-off**: Kernel passes memory addresses straight to the Network Interface Card (NIC) queue.
3. **CPU Preservation**: CPU never copies bytes into intermediate user-space stack or heap buffers.`;
    } else if (style === 'analogies') {
      responseBody = `### Real-World Analogy: The Freight Logistics Depot

Think of normal I/O like receiving a massive shipping crate at your home, unpacking every single box into your living room, repacking it into a new box, and then calling a courier to take it to the airport. It wastes time and clutters your living room.

**Zero-Copy and Distributed Buffering** is like having the freight train deliver straight to the airport cargo bay: the goods never enter your living room at all. The logistics hub (the kernel page cache) redirects the manifest straight onto the departing plane (the network socket).`;
    } else {
      responseBody = `### Core Analysis & First-Principles Breakdown

1. **System Invariant**:
   High-throughput systems are almost never bound by arithmetic execution; they are bound by **memory bus bandwidth** and **context switches**.
   
2. **The Bottleneck**:
   A standard \`read()\` then \`write()\` cycle forces 4 context switches and 4 copies across user space and kernel space.

3. **The Solution in Your Notes**:
   By relying on append-only commit segments and Linux \`sendfile()\`, the OS page cache acts as the single source of truth. Data flows via Direct Memory Access (DMA) from disk to network card without CPU userland interruption.`;
    }

    if (length === 'concise') {
      responseBody += `\n\n**Takeaway:** Keep writes sequential, eliminate userspace buffer bouncing, and let the kernel handle DMA transfers.`;
    } else {
      responseBody += `\n\n### Architectural Synthesis
When you combine this with Raft log replication (from your Year 3 notes), every replica node can stream its committed state machine entries to followers without incurring CPU overhead, preserving computing power for application logic.`;
    }

    return {
      text: responseBody,
      citedNotes,
      yearConnections: connections,
      appliedProfileAttributes: appliedAttributes,
    };
  },

  /**
   * Update the user's learning profile based on interactive feedback pills
   */
  handleFeedbackPill(
    action: 'too-long' | 'analogy' | 'code' | 'lost' | 'quiz',
    currentProfile: LearningProfile,
    topicContext?: string
  ): { updatedProfile: LearningProfile; feedbackMessage: string } {
    const updated = { ...currentProfile };
    let feedbackMessage = '';
    const now = new Date();
    const timestampStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    switch (action) {
      case 'too-long': {
        updated.answerLength = 'concise';
        const newLog: MemoryLogEntry = {
          id: `log-${Date.now()}`,
          timestamp: timestampStr,
          trigger: `Flagged "Too long" on ${topicContext || 'recent explanation'}`,
          insight: 'Prefers high-density summaries and bulleted key takeaways over expansive prose.',
          category: 'habit',
          confidence: 0.92,
          isActive: true,
        };
        updated.memoryLogs = [newLog, ...updated.memoryLogs];
        feedbackMessage = 'Updated profile: Switched answer style to Concise & Bulleted.';
        break;
      }

      case 'analogy': {
        updated.explanationStyle = 'analogies';
        const newLog: MemoryLogEntry = {
          id: `log-${Date.now()}`,
          timestamp: timestampStr,
          trigger: `Requested analogy on ${topicContext || 'concept'}`,
          insight: 'Responds strongly to physical metaphors before delving into formal definitions.',
          category: 'style',
          confidence: 0.89,
          isActive: true,
        };
        updated.memoryLogs = [newLog, ...updated.memoryLogs];
        feedbackMessage = 'Updated profile: Prioritizing real-world analogies and intuitive models.';
        break;
      }

      case 'code': {
        updated.explanationStyle = 'code-first';
        const newLog: MemoryLogEntry = {
          id: `log-${Date.now()}`,
          timestamp: timestampStr,
          trigger: `Requested "Show code example" for ${topicContext || 'topic'}`,
          insight: 'Learns best by inspecting runnable syntax, memory diagrams, and API signatures.',
          category: 'style',
          confidence: 0.96,
          isActive: true,
        };
        updated.memoryLogs = [newLog, ...updated.memoryLogs];
        feedbackMessage = 'Updated profile: Switched to Code-First mode with technical snippets.';
        break;
      }

      case 'lost': {
        updated.socraticPacing = true;
        // Mark topic for revisit if provided
        if (topicContext) {
          const exists = updated.weakTopics.find(t => t.topic.toLowerCase().includes(topicContext.toLowerCase()));
          if (!exists) {
            updated.weakTopics.unshift({
              topic: topicContext,
              courseCode: 'REVIEW',
              year: updated.currentYear,
              masteryLevel: 45,
              needsRevisit: true,
              lastReviewed: now.toISOString().split('T')[0],
              confidenceScore: 0.45,
            });
          }
        }
        const newLog: MemoryLogEntry = {
          id: `log-${Date.now()}`,
          timestamp: timestampStr,
          trigger: `Selected "I'm lost on this" for ${topicContext || 'current topic'}`,
          insight: 'Needs step-by-step scaffolding and verification questions before advancing.',
          category: 'weakness',
          confidence: 0.87,
          isActive: true,
        };
        updated.memoryLogs = [newLog, ...updated.memoryLogs];
        feedbackMessage = 'Logged to "How I Learn": Marked for step-by-step breakdown & added to revisit radar.';
        break;
      }

      case 'quiz': {
        feedbackMessage = 'Generated an active-recall flashcard question from your notes!';
        break;
      }
    }

    storage.saveProfile(updated);
    return { updatedProfile: updated, feedbackMessage };
  }
};
