/* Calls the student's chosen AI provider straight from the browser with their own key.
   The key never touches Grove's servers. Only the question and the few notes needed to answer it are sent. */
import type { LearningProfile, Note } from '../types';

export type Provider = 'mock' | 'anthropic' | 'gemini' | 'openai';
export type LiveProvider = Exclude<Provider, 'mock'>;

export const PROVIDERS: { id: Provider; label: string; sub: string; keyHint: string; model: string; keyUrl?: string }[] = [
  { id: 'mock', label: 'Local Grove', sub: 'No key, works offline', keyHint: '', model: '' },
  { id: 'anthropic', label: 'Claude', sub: 'Anthropic key', keyHint: 'sk-ant-…', model: 'claude-haiku-5-5', keyUrl: 'https://console.anthropic.com/settings/keys' },
  { id: 'gemini', label: 'Gemini', sub: 'Google AI Studio key', keyHint: 'AQ.… or AIza…', model: 'gemini-2.5-flash', keyUrl: 'https://aistudio.google.com/apikey' },
  { id: 'openai', label: 'OpenAI', sub: 'OpenAI key', keyHint: 'sk-…', model: 'gpt-4o-mini', keyUrl: 'https://platform.openai.com/api-keys' },
];

export class LLMError extends Error {}

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) + '…' : s);

export function buildSystemPrompt(profile: LearningProfile): string {
  return [
    `You are Grove, a study companion for ${profile.studentName || 'a university student'}${profile.degreeName ? `, who studies ${profile.degreeName}` : ''}.`,
    'Answer from the student\'s own notes first. When you use a note, name it in square brackets like [Raft Consensus Protocol].',
    'If the notes do not cover the question, say so in one sentence, then answer from general knowledge and mark that part as "not from your notes".',
    'Never invent a note or a quote. If a point is uncertain, say it is uncertain.',
    `Explanation style: ${profile.explanationStyle}. Answer length: ${profile.answerLength}.`,
    profile.socraticPacing ? 'Teach Socratically: give a short hint and finish with one question for the student to answer.' : '',
    profile.codeLanguagePreference ? `When code helps, use ${profile.codeLanguagePreference}.` : '',
    'Use plain markdown: short paragraphs, ### headings only when needed, fenced code blocks for code.',
  ].filter(Boolean).join('\n');
}

export function buildUserPrompt(question: string, notes: Note[]): string {
  const block = notes.length
    ? notes.map((n, i) => `NOTE ${i + 1}: ${n.title} (Year ${n.year}, ${n.courseId})\n${clip(n.content, 1800)}`).join('\n\n---\n\n')
    : '(no matching notes found)';
  return `Student's notes:\n\n${block}\n\nQuestion: ${question}`;
}

async function post(url: string, headers: Record<string, string>, body: unknown): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
  } catch {
    throw new LLMError('Could not reach the provider. Check your connection.');
  }
  if (!res.ok) {
    let detail = '';
    try {
      const j = (await res.json()) as { error?: { message?: string } | string };
      detail = typeof j.error === 'string' ? j.error : j.error?.message ?? '';
    } catch { /* body wasn't JSON */ }
    if (res.status === 401 || res.status === 403) throw new LLMError('The provider rejected this key. Check it and try again.');
    if (res.status === 429) throw new LLMError('Rate limit or quota reached on this key.');
    if (res.status === 404) throw new LLMError(`The provider doesn't know this model. Change the model name in Settings. ${detail}`.trim());
    throw new LLMError(`Provider error ${res.status}. ${detail}`.trim());
  }
  return res.json();
}

export interface LLMRequest {
  provider: LiveProvider;
  key: string;
  model: string;
  system: string;
  user: string;
  maxTokens?: number;
}

export async function generate(r: LLMRequest): Promise<string> {
  const max = r.maxTokens ?? 1200;
  if (r.provider === 'anthropic') {
    const j = (await post(
      'https://api.anthropic.com/v1/messages',
      { 'x-api-key': r.key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      { model: r.model, max_tokens: max, system: r.system, messages: [{ role: 'user', content: r.user }] },
    )) as { content?: { type: string; text?: string }[] };
    return (j.content ?? []).map((c) => c.text ?? '').join('').trim();
  }
  if (r.provider === 'gemini') {
    const j = (await post(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(r.model)}:generateContent`,
      { 'x-goog-api-key': r.key },
      { systemInstruction: { parts: [{ text: r.system }] }, contents: [{ role: 'user', parts: [{ text: r.user }] }], generationConfig: { maxOutputTokens: max } },
    )) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    return (j.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('').trim();
  }
  const j = (await post(
    'https://api.openai.com/v1/chat/completions',
    { authorization: `Bearer ${r.key}` },
    { model: r.model, max_tokens: max, messages: [{ role: 'system', content: r.system }, { role: 'user', content: r.user }] },
  )) as { choices?: { message?: { content?: string } }[] };
  return (j.choices?.[0]?.message?.content ?? '').trim();
}

/** Cheap round trip used by the "Test key" button. */
export async function testKey(provider: LiveProvider, key: string, model: string): Promise<void> {
  const text = await generate({ provider, key, model, system: 'Reply with the single word: ready', user: 'ping', maxTokens: 16 });
  if (!text) throw new LLMError('The provider answered with nothing. Check the model name.');
}
