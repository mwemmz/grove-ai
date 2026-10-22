/* Calls the student's chosen AI provider straight from the browser with their own key.
   The key never touches Grove's servers. Only the question and the few notes needed to answer it are sent. */
import type { LearningProfile, Note } from '../types';
import { storage, type AiTask } from './storage';

import { CATALOG, catalogById, type CustomProvider, type ProviderKind } from '../shared/providerCatalog';
import { apiPost } from '../lib/api';

export type Provider = string;
export type LiveProvider = string;

/** What the rest of the app needs to know about any provider, built-in, catalog or custom. */
export interface ProviderDef {
  id: string;
  label: string;
  kind: ProviderKind;
  baseUrl?: string;
  model: string;
  keyHint: string;
  keyUrl?: string;
  blurb: string;
  builtin: boolean;
  viaProxy: boolean;
  custom: boolean;
}

export function resolveProvider(id: string, custom: CustomProvider[] = storage.getAiConfig().custom): ProviderDef | undefined {
  const c = catalogById(id);
  if (c) return { id: c.id, label: c.label, kind: c.kind, baseUrl: c.baseUrl, model: c.model, keyHint: c.keyHint, keyUrl: c.keyUrl, blurb: c.blurb, builtin: !!c.builtin, viaProxy: !!c.viaProxy, custom: false };
  const u = custom.find((x) => x.id === id);
  if (u) return { id: u.id, label: u.label, kind: 'openai-compat', baseUrl: u.baseUrl, model: u.model, keyHint: 'key', blurb: u.baseUrl, builtin: false, viaProxy: false, custom: true };
  return undefined;
}
export const providerLabel = (id: string) => resolveProvider(id)?.label ?? id;
export const BUILTIN_PROVIDERS = CATALOG.filter((p) => p.builtin);

export class LLMError extends Error {}
export class NetworkError extends LLMError {}

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) + '…' : s);

export function buildSystemPrompt(profile: LearningProfile): string {
  return [
    `You are Grove, the study companion of ${profile.studentName || 'a university student'}${profile.degreeName ? `, who studies ${profile.degreeName}` : ''}. Grove belongs to the student's university and knows its library.`,
    'Material marked LIBRARY comes from the university (past final-year projects, course outlines, policies). It ranks above the student\'s notes, and both rank above general knowledge. Cite what you use by its title in square brackets, like [Final-year project proposal: what to include].',
    'For questions about the university itself (deadlines, rules, supervisors, procedures, formats) answer only from LIBRARY material. If it is not there, say "That is not in the university library yet" and tell the student to ask their department office or supervisor. Never guess these.',
    'Past final-year projects are examples to learn from. Help the student see what was done, what was left open, and what to ask their supervisor. Never write their project text for them, and never present a past project\'s work as theirs. Remind them to cite any project they rely on.',
    'For anything else, answer from the student\'s notes first. If the notes do not cover it, say so in one sentence, then answer from general knowledge and mark that part as "not from your notes".',
    'Never invent a source, a note or a quote. If a point is uncertain, say it is uncertain.',
    `Explanation style: ${profile.explanationStyle}. Answer length: ${profile.answerLength}.`,
    profile.socraticPacing ? 'Teach Socratically: give a short hint and finish with one question for the student to answer.' : '',
    profile.codeLanguagePreference ? `When code helps, use ${profile.codeLanguagePreference}.` : '',
    'Use plain markdown: short paragraphs, ### headings only when needed, fenced code blocks for code.',
  ].filter(Boolean).join('\n');
}

export interface PromptSource {
  title: string;
  meta: string;
  text: string;
}

export function buildUserPrompt(
  question: string,
  notes: Note[],
  previous?: { question: string; answer: string },
  sources: PromptSource[] = []
): string {
  const lib = sources.length
    ? sources.map((s, i) => `LIBRARY ${i + 1}: ${s.title} (${s.meta})\n${clip(s.text, 1800)}`).join('\n\n---\n\n')
    : '(nothing in the library matched)';
  const block = notes.length
    ? notes.map((n, i) => `NOTE ${i + 1}: ${n.title} (Year ${n.year}, ${n.courseId})\n${clip(n.content, 1800)}`).join('\n\n---\n\n')
    : '(no matching notes found)';
  const prior = previous ? `Previous exchange (for follow-ups):\nStudent: ${clip(previous.question, 300)}\nGrove: ${clip(previous.answer, 1500)}\n\n` : '';
  return `University library:\n\n${lib}\n\nStudent's notes:\n\n${block}\n\n${prior}Question: ${question}`;
}

function statusError(status: number, detail: string): LLMError {
  if (status === 401 || status === 403) return new LLMError('The provider rejected this key. Check it and try again.');
  if (status === 429) return new LLMError('Rate limit or quota reached on this key.');
  if (status === 404) return new LLMError(`The provider doesn't know this model. Change the model name in Settings. ${detail}`.trim());
  if (status === 504) return new LLMError(detail || 'The provider did not answer in time.');
  return new LLMError(`Provider error ${status}. ${detail}`.trim());
}

const errorDetail = (j: unknown): string => {
  const e = (j as { error?: { message?: string } | string } | null)?.error;
  return typeof e === 'string' ? e : e?.message ?? '';
};

async function post(url: string, headers: Record<string, string>, body: unknown): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
  } catch {
    throw new NetworkError('Could not reach the provider. Check your connection, or the provider may not allow calls from a browser.');
  }
  if (!res.ok) {
    let detail = '';
    try { detail = errorDetail(await res.json()); } catch { /* body wasn't JSON */ }
    throw statusError(res.status, detail);
  }
  return res.json();
}

/** Same request, sent through Grove's signed-in relay for hosts that block browsers. Only catalog providers are allowed. */
async function postViaRelay(providerId: string, key: string, payload: unknown): Promise<unknown> {
  let out: { status: number; data: unknown };
  try {
    out = await apiPost<{ status: number; data: unknown }>('/ai-proxy', { provider: providerId, apiKey: key, payload });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('(401)')) throw new LLMError('Sign in to Grove to use this provider.');
    throw new LLMError('Grove could not reach the provider through its server. This provider may not work on this deployment yet.');
  }
  if (out.status < 200 || out.status >= 300) throw statusError(out.status, errorDetail(out.data));
  return out.data;
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
      {
        systemInstruction: { parts: [{ text: r.system }] },
        contents: [{ role: 'user', parts: [{ text: r.user }] }],
        // Gemini 2.5 Flash "thinks" by default and thinking tokens count against maxOutputTokens, which can leave an empty answer.
        generationConfig: { maxOutputTokens: max, ...(/flash/i.test(r.model) ? { thinkingConfig: { thinkingBudget: 0 } } : {}) },
      },
    )) as { candidates?: { finishReason?: string; content?: { parts?: { text?: string }[] } }[]; promptFeedback?: { blockReason?: string } };
    const out = (j.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('').trim();
    if (!out) {
      if (j.promptFeedback?.blockReason) throw new LLMError(`Gemini blocked this prompt (${j.promptFeedback.blockReason}).`);
      throw new LLMError(`Gemini returned no text${j.candidates?.[0]?.finishReason ? ` (${j.candidates[0].finishReason})` : ''}. Try a different model name.`);
    }
    return out;
  }
  const def = resolveProvider(r.provider);
  if (!def || def.kind !== 'openai-compat' || !def.baseUrl) throw new LLMError('Unknown provider. Re-add it in Settings.');
  const payload = { model: r.model, max_tokens: max, messages: [{ role: 'system', content: r.system }, { role: 'user', content: r.user }] };
  let j: unknown;
  if (def.viaProxy) {
    j = await postViaRelay(def.id, r.key, payload);
  } else {
    try {
      j = await post(`${def.baseUrl}/chat/completions`, { authorization: `Bearer ${r.key}` }, payload);
    } catch (err) {
      // Listed providers can fall back to the relay when the browser is blocked. Custom ones cannot (the relay only reaches listed hosts).
      if (err instanceof NetworkError && !def.custom && catalogById(def.id)) j = await postViaRelay(def.id, r.key, payload);
      else throw err;
    }
  }
  const out = ((j as { choices?: { message?: { content?: string } }[] })?.choices?.[0]?.message?.content ?? '').trim();
  if (!out) throw new LLMError('The provider returned no text. Check the model name.');
  return out;
}

/** Cheap round trip used by the "Test key" button. */
export async function testKey(provider: LiveProvider, key: string, model: string): Promise<void> {
  const text = await generate({ provider, key, model, system: 'Reply with the single word: ready', user: 'ping', maxTokens: 64 });
  if (!text) throw new LLMError('The provider answered with nothing. Check the model name.');
}

export interface RoutedResult {
  text: string;
  provider: LiveProvider;
  /** Providers that were tried first and failed, with the reason, in order. */
  failed: { provider: LiveProvider; reason: string }[];
}

/** Providers that have a key, in the order this task should try them. */
export function candidatesFor(task: AiTask): LiveProvider[] {
  const cfg = storage.getAiConfig();
  const withKey = cfg.order.filter((p) => storage.getApiKey(p) && resolveProvider(p, cfg.custom));
  const route = cfg.routes[task];
  if (route !== 'auto' && withKey.includes(route)) {
    const rest = withKey.filter((p) => p !== route);
    return cfg.failover ? [route, ...rest] : [route];
  }
  return cfg.failover ? withKey : withKey.slice(0, 1);
}

/** Try each candidate in turn. The same system prompt, notes and previous exchange go to the next provider,
 *  so a second model picks up exactly where the first one stopped. */
export async function generateRouted(task: AiTask, system: string, user: string, maxTokens?: number): Promise<RoutedResult | null> {
  const list = candidatesFor(task);
  if (list.length === 0) return null;
  const failed: RoutedResult['failed'] = [];
  for (const provider of list) {
    const def = resolveProvider(provider)!;
    try {
      const text = await generate({ provider, key: storage.getApiKey(provider), model: storage.getApiModel(provider) || def.model, system, user, maxTokens });
      if (text) return { text, provider, failed };
      failed.push({ provider, reason: 'empty reply' });
    } catch (err) {
      failed.push({ provider, reason: err instanceof Error ? err.message : 'unknown error' });
    }
  }
  throw new LLMError(failed.map((f) => `${providerLabel(f.provider)}: ${f.reason}`).join(' | '));
}
