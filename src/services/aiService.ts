import { Note, LearningProfile, AcademicYear, MemoryLogEntry, StudentTier, SourceRef } from '../types';
import { storage } from './storage';
import { searchSources, toRef, INSTITUTIONAL_RE, type Hit } from './knowledge';
import { searchNotes, searchSections, answerFromNotes, groundingFor } from './noteSearch';
import { recallFor } from '../lib/noteStructure';
import { hybridSections } from './semantic';
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
  /** The note and section this answer is mainly about. */
  topic?: { note: Note; section: string };
  /** A quick question to check understanding afterwards, from that section of the notes. */
  check?: { q: string; a: string[] };
}

let lastHits: Awaited<ReturnType<typeof hybridSections>> = [];


export const aiService = {
  /**
   * Search notes for relevance against a user query
   */
  findRelevantNotes(query: string, allNotes: Note[]): { note: Note; score: number }[] {
    return searchNotes(query, allNotes).map(({ note, score }) => ({ note, score }));
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
  /** Answers a question and attaches what it was about and a check-yourself question. */
  async askGrove(
    question: string,
    allNotes: Note[],
    profile: LearningProfile,
    opts: { live?: boolean; task?: 'ask' | 'quiz'; previous?: { question: string; answer: string } } = {}
  ): Promise<AIResponsePayload> {
    lastHits = [];
    const payload = await this.answer(question, allNotes, profile, opts);
    const top = lastHits[0];
    if (top && payload.citedNotes.some((c) => c.noteId === top.note.id)) {
      payload.topic = { note: top.note, section: top.section.title };
      const r = recallFor(top.section);
      if (r && opts.task !== 'quiz') payload.check = r;
    }
    return payload;
  },

  async answer(
    question: string,
    allNotes: Note[],
    profile: LearningProfile,
    opts: { live?: boolean; task?: 'ask' | 'quiz'; previous?: { question: string; answer: string } } = {}
  ): Promise<AIResponsePayload> {
    const live = opts.live !== false; // demo seeding passes live:false so it never spends the student's key
    const qLower = question.toLowerCase();
    // A student's attempt rides along with the question for the AI to mark; searching uses the question alone.
    const searchQ = question.split('\n\nMy attempt:')[0];
    const noteHits = await hybridSections(searchQ, allNotes, 6);
    lastHits = noteHits;
    // Notes in the order their best section ranked (meaning search can find a note the keywords missed).
    const keywordRelevant = this.findRelevantNotes(searchQ, allNotes);
    const fromHits = [...new Map(noteHits.map((h) => [h.note.id, { note: h.note, score: h.score }])).values()];
    const relevant = fromHits.length ? fromHits : keywordRelevant;
    const topNotes = relevant.slice(0, 3).map(r => r.note);
    const connections = this.findCrossYearConnections(topNotes.length > 0 ? topNotes : allNotes);

    // The university library comes first: past final-year projects, course outlines and policies.
    const institutional = INSTITUTIONAL_RE.test(question);
    const rawHits = searchSources(searchQ, { n: 4 });
    // A question about a rule is answered by a rule. A past project that merely shares a word is not an answer.
    const strongProject = rawHits.some((h) => h.source.kind === 'project' && h.score >= 12);
    // A question the student's own notes can answer is not handed to a library record that only shares a word like "data".
    const wantsLibrary = institutional || /\b(projects?|dissertations?|thesis|capstone|polic(y|ies)|handbook|outline|syllabus|library|supervisors?)\b/i.test(question);
    const libHits = (noteHits.length > 0 && !wantsLibrary) || (institutional && !strongProject && !rawHits.some((h) => h.source.kind !== 'project')) ? [] : rawHits;

    const citedNotes = topNotes.map(n => ({
      noteId: n.id,
      courseCode: n.courseId.replace(/^c-/, '').split('-')[0].toUpperCase(),
      year: n.year,
      title: n.title,
      relevanceQuote: noteHits.find((h) => h.note.id === n.id)?.section.title ?? (n.keyTakeaways[0] || n.summary),
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
          ? this.generateNotesResponse(question, allNotes, noteHits, profile, citedNotes, appliedAttributes)
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
      resp.appliedProfileAttributes = ['Answered from your notes, no AI engine used. Add an AI key in Settings for a fuller written answer.', ...resp.appliedProfileAttributes];
    } else {
      try {
        const grounding = noteHits.length ? groundingFor(noteHits) : relevant.slice(0, 5).map((r) => r.note);
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
  /** The no-AI answer: built from the matching section of the student's notes, shaped like the question. */
  generateNotesResponse(
    question: string,
    allNotes: Note[],
    hits: ReturnType<typeof searchSections>,
    profile: LearningProfile,
    citedNotes: AIResponsePayload['citedNotes'],
    appliedAttributes: string[]
  ): AIResponsePayload {
    const attempt = question.includes('\n\nMy attempt:');
    const local = answerFromNotes(question.split('\n\nMy attempt:')[0], allNotes, { concise: profile.answerLength === 'concise', hits });
    if (local && attempt) local.text = `Without an AI engine Grove can't mark your working, but here is what your notes say. Compare it with your attempt, step by step.\n\n${local.text}`;
    if (!local) {
      return {
        text: `Your notes mention this, but no single section answers it directly. Open the notes listed below, or connect an AI engine in Settings for a written explanation from them.`,
        citedNotes,
        yearConnections: [],
        appliedProfileAttributes: appliedAttributes,
      };
    }
    const used = new Set(local.used.map((u) => u.note.id));
    return {
      text: local.text,
      citedNotes: citedNotes.filter((c) => used.has(c.noteId)).concat(citedNotes.filter((c) => !used.has(c.noteId))).slice(0, 3),
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
