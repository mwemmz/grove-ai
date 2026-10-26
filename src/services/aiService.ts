import { Note, LearningProfile, AcademicYear, MemoryLogEntry, StudentTier, SourceRef } from '../types';
import { storage } from './storage';
import { searchSources, toRef, tokens, INSTITUTIONAL_RE, type Hit } from './knowledge';
import { providerLabel, buildSystemPrompt, buildUserPrompt, generateRouted, candidatesFor } from './llmService';

export interface AIResponsePayload {
  text: string;
  /** The university's own material this answer drew on. */
  sources?: SourceRef[];
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
    // Meaningful words only (no "how", "does", "work"), stemmed, so a stray common word can't pull in a note.
    const queryTokens = [...new Set(tokens(query))];

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
  findCrossYearConnections(_relevantNotes: Note[]): AIResponsePayload['yearConnections'] {
    // Grove no longer writes connections it cannot back with the student's own notes.
    return [];
  },

  /**
   * Primary query function: adapts to student profile and synthesizes answer
   */
  async askGrove(
    question: string,
    allNotes: Note[],
    profile: LearningProfile,
    opts: { live?: boolean; task?: 'ask' | 'quiz'; previous?: { question: string; answer: string } } = {}
  ): Promise<AIResponsePayload> {
    const live = opts.live !== false; // demo seeding passes live:false so it never spends the student's key
    const qLower = question.toLowerCase();
    const relevant = this.findRelevantNotes(question, allNotes);
    const topNotes = relevant.slice(0, 3).map(r => r.note);
    const connections = this.findCrossYearConnections(topNotes.length > 0 ? topNotes : allNotes);

    // The university library comes first: past final-year projects, course outlines and policies.
    const institutional = INSTITUTIONAL_RE.test(question);
    const rawHits = searchSources(question, { n: 4 });
    // A question about a rule is answered by a rule. A past project that merely shares a word is not an answer.
    const strongProject = rawHits.some((h) => h.source.kind === 'project' && h.score >= 12);
    const libHits = institutional && !strongProject && !rawHits.some((h) => h.source.kind !== 'project') ? [] : rawHits;

    const citedNotes = topNotes.map(n => ({
      noteId: n.id,
      courseCode: n.courseId.replace(/^c-/, '').split('-')[0].toUpperCase(),
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
      resp.appliedProfileAttributes = ['Answered by Local Grove (timeline from your notes)', ...resp.appliedProfileAttributes];
      return resp;
    }

    // Default intelligent synthesized answer adapted to user style
    const greeting = /^\s*(hi|hello|hey|yo|good (morning|afternoon|evening)|thanks?|thank you)\b[\s!.?]*$/i.test(question);
    // A rules question the library can't answer is never answered from guesswork, even if a note shares a word.
    const notInLibrary = institutional && libHits.length === 0;
    const resp: AIResponsePayload =
      libHits.length > 0
        // the library answered, so loosely matching notes and cross-year links would only be noise
        ? this.generateLibraryResponse(libHits, [], [], appliedAttributes, /\b(deadlines?|due|dates?|when|fees?|how much|how many|limit)\b/i.test(question))
        : topNotes.length > 0 && !notInLibrary
          ? this.generateAdaptiveResponse(question, topNotes, profile, citedNotes, connections, appliedAttributes)
          : {
              text: greeting
                ? `Hi${profile.studentName ? ` ${profile.studentName.split(' ')[0]}` : ''}! Ask me about your course, the final-year project process, or something you have studied. I answer from your university's library and your own notes, and I tell you when I cannot find it.`
                : notInLibrary
                  ? `That is not in the university library yet, so I will not guess. Ask your department office or your supervisor. If you have the document, add it under Library and I can answer from it.`
                  : `I could not find that in the university library or your notes, so I will not guess. Try different words, add a note about it under "Add to your grove", or connect an AI engine in Settings and I can also answer from general knowledge, clearly marked as not from your sources.`,
              citedNotes: [],
              yearConnections: [],
              appliedProfileAttributes: appliedAttributes,
            };
    resp.seniorTips = matchingSeniorTips;
    if (libHits.length > 0) resp.sources = libHits.map(toRef);

    // A real model answers when the student has connected a key; the local answer is the safety net.
    const task = opts.task ?? 'ask';
    // Never spend the student's key guessing at a rule the library doesn't contain.
    const ready = live && candidatesFor(task).length > 0 && !notInLibrary;
    if (!ready) {
      resp.appliedProfileAttributes = ['Answered by Local Grove. Add an AI key in Settings for fuller answers.', ...resp.appliedProfileAttributes];
    } else {
      try {
        const grounding = relevant.slice(0, 5).map((r) => r.note);
        const out = await generateRouted(task, buildSystemPrompt(profile), buildUserPrompt(question, grounding, opts.previous, libHits.map((h) => ({ title: h.source.title, meta: h.source.meta, text: h.source.text }))));
        if (out) {
          const label = providerLabel(out.provider);
          const first = out.failed[0];
          const tag = first
            ? `Answered by ${label}, after ${providerLabel(first.provider)} failed (${first.reason})`
            : `Answered by ${label}`;
          resp.text = out.text;
          resp.appliedProfileAttributes = [tag, ...resp.appliedProfileAttributes];
        }
      } catch (err) {
        resp.appliedProfileAttributes = [`AI engine unavailable, used local answer (${err instanceof Error ? err.message : 'unknown error'})`, ...resp.appliedProfileAttributes];
      }
    }
    return resp;
  },

  /** Answers straight from the university's own material, quoting it, with no model involved. */
  generateLibraryResponse(
    hits: Hit[],
    citedNotes: AIResponsePayload['citedNotes'],
    connections: AIResponsePayload['yearConnections'],
    appliedAttributes: string[],
    mayNeedConfirming = false
  ): AIResponsePayload {
    const projects = hits.filter((h) => h.source.kind === 'project');
    const rules = hits.filter((h) => h.source.kind !== 'project');
    const parts: string[] = [];

    if (rules.length > 0) {
      parts.push('### What the library says');
      rules.slice(0, 2).forEach((h) => {
        parts.push(`> ${h.passage}`);
        parts.push(`From **${h.source.title}** (${h.source.meta}).`);
      });
      if (mayNeedConfirming) parts.push('This is the library\'s wording. If your question is about a specific date or a case that is not covered, confirm with your department office.');
    }

    if (projects.length > 0) {
      parts.push('### Past projects close to this');
      parts.push(
        projects
          .slice(0, 3)
          .map((h, i) => `${i + 1}. **${h.source.title}** (${h.source.meta}). ${(h.source.fields?.problem ?? h.passage).split(/(?<=[.!?])\s/)[0]}`)
          .join('\n')
      );
      const open = projects
        .slice(0, 2)
        .filter((h) => h.source.fields)
        .map((h) => `- **${h.source.title}** left this open: ${h.source.fields!.limitations.split(/(?<=[.!?])\s/)[0]} Next step they suggest: ${h.source.fields!.future.split(/(?<=[.!?])\s/)[0]}`);
      if (open.length > 0) {
        parts.push('### What they left open');
        parts.push(open.join('\n'));
      }
      parts.push('Use these to learn what was done and what to ask your supervisor. Cite any project you rely on, and do not copy from it.');
    }

    return {
      text: parts.join('\n\n'),
      citedNotes,
      yearConnections: connections,
      appliedProfileAttributes: appliedAttributes,
    };
  },

  generateTimelineResponse(
    question: string,
    allNotes: Note[],
    _profile: LearningProfile,
    citedNotes: AIResponsePayload['citedNotes'],
    connections: AIResponsePayload['yearConnections'],
    appliedAttributes: string[]
  ): AIResponsePayload {
    const byYear = [...citedNotes].sort((x, y) => x.year - y.year);
    const lines = byYear.map((n, i) => `${i + 1}. **Year ${n.year} · ${n.courseCode}**: ${n.title}${n.relevanceQuote ? `\n   ${n.relevanceQuote}` : ''}`);
    return {
      text: lines.length
        ? `### Where this shows up in your notes\n\nOldest first:\n\n${lines.join('\n\n')}`
        : 'I could not find this in your notes yet. Add the notes where you first met it and ask again.',
      citedNotes,
      yearConnections: connections,
      appliedProfileAttributes: [...appliedAttributes, 'Chronological Lineage Mode'],
    };
  },

  /** Without an AI key: quote the slides or paragraphs from the student's own notes that best match the question. */
  generateAdaptiveResponse(
    question: string,
    notes: Note[],
    profile: LearningProfile,
    citedNotes: AIResponsePayload['citedNotes'],
    connections: AIResponsePayload['yearConnections'],
    appliedAttributes: string[]
  ): AIResponsePayload {
    const qt = new Set(tokens(question));
    const passages: { note: Note; text: string; score: number }[] = [];
    for (const note of notes) {
      for (const para of note.content.split(/\n{2,}/)) {
        const words = tokens(para);
        if (words.length < 4) continue;
        const hit = new Set(words.filter((w) => qt.has(w)));
        if (hit.size === 0) continue;
        passages.push({ note, text: para.trim(), score: hit.size * 3 + Math.min(words.filter((w) => qt.has(w)).length, 6) });
      }
    }
    passages.sort((a, b) => b.score - a.score);
    const take = passages.slice(0, profile.answerLength === 'concise' ? 2 : 3);
    if (take.length === 0) {
      return {
        text: `Your notes mention this, but no single passage answers it directly. Open the notes listed below, or connect an AI engine in Settings for a written explanation from them.`,
        citedNotes,
        yearConnections: [],
        appliedProfileAttributes: appliedAttributes,
      };
    }
    const clip = (t: string) => (t.length > 520 ? t.slice(0, 517).replace(/\s+\S*$/, '') + '…' : t);
    const quote = (t: string) => {
      // A slide has a real title line ("### …"); any other paragraph is quoted whole.
      if (!t.startsWith('### ')) return `> ${clip(t.replace(/\s+/g, ' ').trim())}`;
      const [head, ...rest] = t.slice(4).split('\n');
      const body = rest.join(' ').replace(/\s+/g, ' ').trim();
      return body ? `**${head}**\n> ${clip(body)}` : `> ${head}`;
    };
    const parts = ['### From your notes'];
    for (const p of take) parts.push(`${quote(p.text)}\n\nFrom **${p.note.title}** (Year ${p.note.year}).`);
    parts.push('These are your own notes, quoted. Connect an AI engine in Settings and Grove will explain them in its own words, still citing the notes.');
    return {
      text: parts.join('\n\n'),
      citedNotes: citedNotes.filter((c) => take.some((p) => p.note.id === c.noteId)).concat(citedNotes.filter((c) => !take.some((p) => p.note.id === c.noteId))).slice(0, 3),
      yearConnections: [],
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
