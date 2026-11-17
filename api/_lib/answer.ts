/* Grove's own AI: answers for students who have not added an AI key of their own.
   The university (or whoever runs Grove) sets one key on the server:
     GROVE_AI_PROVIDER  a provider id from src/shared/providerCatalog.ts (e.g. gemini, groq, openai, anthropic)
     GROVE_AI_KEY       its API key (never sent to the browser)
     GROVE_AI_MODEL     optional, overrides the catalog's default model
     GROVE_AI_DAILY     optional, answers per student per day (default 40)
   Signed-in students only, with a daily allowance so one account can't use up the key. */
import { sql } from 'drizzle-orm';
import { catalogById } from '../../src/shared/providerCatalog.js';
import { db, DbUser } from './db.js';
import { ApiError, HandlerReq, HandlerRes, json, requireObjectBody } from './http.js';

export const groveAiConfigured = () => !!(process.env.GROVE_AI_KEY && catalogById(process.env.GROVE_AI_PROVIDER ?? ''));
const daily = () => Math.max(1, Number(process.env.GROVE_AI_DAILY) || 40);

let ready: Promise<unknown> | null = null;
const ensureTable = () =>
  (ready ??= db.execute(sql`
    create table if not exists ai_usage (
      who text not null,
      day date not null,
      n int not null default 0,
      primary key (who, day)
    )`));

async function call(system: string, user: string, maxTokens: number): Promise<string> {
  const def = catalogById(process.env.GROVE_AI_PROVIDER ?? '')!;
  const key = process.env.GROVE_AI_KEY!;
  const model = process.env.GROVE_AI_MODEL || def.model;
  const signal = AbortSignal.timeout(55_000);
  const post = async (url: string, headers: Record<string, string>, body: unknown) => {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body), signal });
    const j = (await r.json().catch(() => null)) as Record<string, unknown> | null;
    if (!r.ok) throw new ApiError(502, `Grove's AI is unavailable right now (${r.status}).`);
    return j ?? {};
  };
  if (def.kind === 'anthropic') {
    const j = (await post('https://api.anthropic.com/v1/messages', { 'x-api-key': key, 'anthropic-version': '2023-06-01' }, { model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] })) as { content?: { text?: string }[] };
    return (j.content ?? []).map((c) => c.text ?? '').join('').trim();
  }
  if (def.kind === 'gemini') {
    const j = (await post(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { 'x-goog-api-key': key }, {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { maxOutputTokens: maxTokens, ...(/flash/i.test(model) ? { thinkingConfig: { thinkingBudget: 0 } } : {}) },
    })) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    return (j.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('').trim();
  }
  const j = (await post(`${def.baseUrl}/chat/completions`, { authorization: `Bearer ${key}` }, {
    model,
    max_tokens: maxTokens,
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
  })) as { choices?: { message?: { content?: string } }[] };
  return (j.choices?.[0]?.message?.content ?? '').trim();
}

/** POST /api/answer  { system, user, maxTokens }  → { text, left } */
export async function writeAnswer(req: HandlerReq, res: HandlerRes, user: DbUser): Promise<void> {
  if (req.method !== 'POST') throw new ApiError(405, 'POST only');
  if (!groveAiConfigured()) throw new ApiError(503, "Grove's own AI is not set up on this server.");
  const b = requireObjectBody(req.body);
  const system = typeof b.system === 'string' ? b.system.slice(0, 12_000) : '';
  const prompt = typeof b.user === 'string' ? b.user.slice(0, 40_000) : '';
  const maxTokens = Math.min(Math.max(Number(b.maxTokens) || 1200, 200), 3000);
  if (!prompt) throw new ApiError(400, 'Nothing to answer');
  await ensureTable();
  const used = ((await db.execute(sql`
    insert into ai_usage (who, day, n) values (${user.clerkId}, current_date, 1)
    on conflict (who, day) do update set n = ai_usage.n + 1
    returning n`)).rows as unknown as { n: number }[])[0]?.n ?? 1;
  if (used > daily()) throw new ApiError(429, `You've used today's ${daily()} answers from Grove's AI. They reset tomorrow; answers from your notes still work.`);
  if (Math.random() < 0.02) await db.execute(sql`delete from ai_usage where day < current_date - 30`);
  const text = await call(system, prompt, maxTokens);
  if (!text) throw new ApiError(502, "Grove's AI returned no answer. Try again.");
  json(res, { text, left: daily() - used });
}
