/* Grove's own AI: answers for students who have not added an AI key of their own.
   The university (or whoever runs Grove) sets one key on the server:
     GROVE_AI_PROVIDER  a provider id from src/shared/providerCatalog.ts (e.g. gemini, groq, openai, anthropic)
     GROVE_AI_KEY       its API key (never sent to the browser)
     GROVE_AI_MODEL     optional, overrides the catalog's default model
     GROVE_AI_DAILY     optional, answers per student per day (default 40)
   Signed-in students only, with a daily allowance so one account can't use up the key. */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { catalogById, CATALOG } from '../../src/shared/providerCatalog.js';
import { db, DbUser } from './db.js';
import { ApiError, HandlerReq, HandlerRes, json, requireObjectBody } from './http.js';

/* The key can be set by an admin in the app (stored encrypted in the database) or, as before, in environment variables.
   The app setting wins when both exist. The key itself is never sent to a browser. */
interface Config { provider: string; key: string; model: string; daily: number; source: 'app' | 'env'; by?: string; at?: string }
const secret = () => createHash('sha256').update(`grove-ai:${process.env.CLERK_SECRET_KEY ?? ''}`).digest();
const seal = (plain: string) => {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', secret(), iv);
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString('base64')).join('.');
};
const unseal = (packed: string) => {
  const [iv, tag, enc] = packed.split('.').map((x) => Buffer.from(x, 'base64'));
  const d = createDecipheriv('aes-256-gcm', secret(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString('utf8');
};

let settingsReady: Promise<unknown> | null = null;
const ensureSettings = () => (settingsReady ??= db.execute(sql`create table if not exists app_settings (key text primary key, value jsonb not null, updated_at timestamptz not null default now(), updated_by text)`));

let cached: { at: number; cfg: Config | null } | null = null;
export async function aiConfig(): Promise<Config | null> {
  if (cached && Date.now() - cached.at < 30_000) return cached.cfg;
  let cfg: Config | null = null;
  try {
    await ensureSettings();
    const row = (await db.execute(sql`select value, updated_at, updated_by from app_settings where key = 'grove_ai'`)).rows[0] as { value: { provider: string; keyEnc: string; model?: string; daily?: number }; updated_at: string; updated_by: string | null } | undefined;
    if (row && catalogById(row.value.provider)) {
      cfg = { provider: row.value.provider, key: unseal(row.value.keyEnc), model: row.value.model || catalogById(row.value.provider)!.model, daily: Math.max(1, Number(row.value.daily) || 40), source: 'app', by: row.updated_by ?? undefined, at: String(row.updated_at) };
    }
  } catch {
    /* fall back to the environment */
  }
  if (!cfg && process.env.GROVE_AI_KEY && catalogById(process.env.GROVE_AI_PROVIDER ?? '')) {
    const def = catalogById(process.env.GROVE_AI_PROVIDER!)!;
    cfg = { provider: def.id, key: process.env.GROVE_AI_KEY, model: process.env.GROVE_AI_MODEL || def.model, daily: Math.max(1, Number(process.env.GROVE_AI_DAILY) || 40), source: 'env' };
  }
  cached = { at: Date.now(), cfg };
  return cfg;
}
export const groveAiConfigured = async () => !!(await aiConfig());

/** What an admin sees: never the key, only its last four characters. */
export async function aiStatus() {
  const c = await aiConfig();
  return {
    configured: !!c,
    source: c?.source ?? null,
    provider: c?.provider ?? null,
    model: c?.model ?? null,
    daily: c?.daily ?? 40,
    keyEnd: c ? c.key.slice(-4) : null,
    updatedBy: c?.by ?? null,
    updatedAt: c?.at ?? null,
    providers: CATALOG.map((p) => ({ id: p.id, label: p.label, model: p.model, keyHint: p.keyHint, keyUrl: p.keyUrl ?? null })),
  };
}

export async function saveAiConfig(b: Record<string, unknown>, by: string) {
  const provider = typeof b.provider === 'string' ? b.provider : '';
  const def = catalogById(provider);
  if (!def) throw new ApiError(400, 'Choose a provider from the list');
  const prev = await aiConfig();
  const keyIn = typeof b.key === 'string' ? b.key.trim() : '';
  if (keyIn && (keyIn.length < 8 || keyIn.length > 400 || /\s/.test(keyIn))) throw new ApiError(400, 'That does not look like an API key');
  const key = keyIn || (prev && prev.provider === provider ? prev.key : '');
  if (!key) throw new ApiError(400, 'Paste the API key for this provider');
  const model = typeof b.model === 'string' ? b.model.trim() : '';
  if (model && !/^[\w./:@+-]{1,120}$/.test(model)) throw new ApiError(400, 'That model name has characters Grove cannot use');
  const daily = Math.min(1000, Math.max(1, Math.floor(Number(b.daily) || 40)));
  await ensureSettings();
  await db.execute(sql`
    insert into app_settings (key, value, updated_at, updated_by) values ('grove_ai', ${JSON.stringify({ provider, keyEnc: seal(key), model: model || null, daily })}::jsonb, now(), ${by})
    on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by`);
  cached = null;
}

export async function clearAiConfig() {
  await ensureSettings();
  await db.execute(sql`delete from app_settings where key = 'grove_ai'`);
  cached = null;
}

/** One tiny request to the provider with the saved key, so an admin can tell at once whether it works. */
export async function testAi(): Promise<{ ok: boolean; message: string }> {
  try {
    const text = await call('Reply with the single word: ready', 'Are you there?', 20);
    return text ? { ok: true, message: `Working. The provider answered: "${text.slice(0, 60)}".` } : { ok: false, message: 'The provider answered with nothing.' };
  } catch (e) {
    return { ok: false, message: e instanceof ApiError ? e.message : 'Could not reach the provider.' };
  }
}

const daily = (c: Config) => c.daily;

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
  const cfg = await aiConfig();
  if (!cfg) throw new ApiError(503, "Grove's own AI is not set up on this server.");
  const def = catalogById(cfg.provider)!;
  const key = cfg.key;
  const model = cfg.model;
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
  const cfg = await aiConfig();
  if (!cfg) throw new ApiError(503, "Grove's own AI is not set up on this server.");
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
  if (used > daily(cfg)) throw new ApiError(429, `You've used today's ${daily(cfg)} answers from Grove's AI. They reset tomorrow; answers from your notes still work.`);
  if (Math.random() < 0.02) await db.execute(sql`delete from ai_usage where day < current_date - 30`);
  const text = await call(system, prompt, maxTokens);
  if (!text) throw new ApiError(502, "Grove's AI returned no answer. Try again.");
  json(res, { text, left: daily(cfg) - used });
}
