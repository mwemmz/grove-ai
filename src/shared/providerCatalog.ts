/* Providers Grove knows about. Shared by the browser and the server relay (api/ai-proxy.ts),
   so the relay can only ever reach hosts listed here. Model names change often: students can edit them. */

export type ProviderKind = 'anthropic' | 'gemini' | 'openai-compat';

export interface CatalogProvider {
  id: string;
  label: string;
  kind: ProviderKind;
  /** OpenAI-compatible base URL (".../v1"); unused for anthropic and gemini. */
  baseUrl?: string;
  model: string;
  keyHint: string;
  keyUrl?: string;
  blurb: string;
  /** Built-ins are always listed. Everything else is added from the search. */
  builtin?: boolean;
  /** Browsers are blocked from this host, so calls go through Grove's signed-in relay. */
  viaProxy?: boolean;
  /** Extra words the search should match. */
  tags?: string;
}

export const CATALOG: CatalogProvider[] = [
  { id: 'anthropic', label: 'Claude', kind: 'anthropic', model: 'claude-haiku-5-5', keyHint: 'sk-ant-…', keyUrl: 'https://console.anthropic.com/settings/keys', blurb: 'Anthropic', builtin: true, tags: 'anthropic sonnet haiku opus' },
  { id: 'gemini', label: 'Gemini', kind: 'gemini', model: 'gemini-2.5-flash', keyHint: 'AQ.… or AIza…', keyUrl: 'https://aistudio.google.com/apikey', blurb: 'Google AI Studio', builtin: true, tags: 'google ai studio' },
  { id: 'openai', label: 'OpenAI', kind: 'openai-compat', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', keyHint: 'sk-…', keyUrl: 'https://platform.openai.com/api-keys', blurb: 'GPT models', builtin: true, tags: 'gpt chatgpt' },
  { id: 'nvidia', label: 'NVIDIA', kind: 'openai-compat', baseUrl: 'https://integrate.api.nvidia.com/v1', model: 'meta/llama-3.1-70b-instruct', keyHint: 'nvapi-…', keyUrl: 'https://build.nvidia.com/', blurb: 'Free models for Developer Program members', viaProxy: true, tags: 'nim llama developer program build.nvidia.com' },
  { id: 'groq', label: 'Groq', kind: 'openai-compat', baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile', keyHint: 'gsk_…', keyUrl: 'https://console.groq.com/keys', blurb: 'Very fast open models, free tier', tags: 'llama fast free' },
  { id: 'openrouter', label: 'OpenRouter', kind: 'openai-compat', baseUrl: 'https://openrouter.ai/api/v1', model: 'meta-llama/llama-3.3-70b-instruct:free', keyHint: 'sk-or-…', keyUrl: 'https://openrouter.ai/keys', blurb: 'One key for many models, some free', tags: 'many models free router' },
  { id: 'together', label: 'Together AI', kind: 'openai-compat', baseUrl: 'https://api.together.xyz/v1', model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', keyHint: 'key', keyUrl: 'https://api.together.ai/settings/api-keys', blurb: 'Open models', tags: 'llama qwen' },
  { id: 'mistral', label: 'Mistral', kind: 'openai-compat', baseUrl: 'https://api.mistral.ai/v1', model: 'mistral-small-latest', keyHint: 'key', keyUrl: 'https://console.mistral.ai/api-keys', blurb: 'Mistral AI', tags: 'mixtral le chat' },
  { id: 'deepseek', label: 'DeepSeek', kind: 'openai-compat', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat', keyHint: 'sk-…', keyUrl: 'https://platform.deepseek.com/api_keys', blurb: 'DeepSeek models', tags: 'r1 reasoning' },
  { id: 'xai', label: 'xAI', kind: 'openai-compat', baseUrl: 'https://api.x.ai/v1', model: 'grok-3-mini', keyHint: 'xai-…', keyUrl: 'https://console.x.ai/', blurb: 'Grok', tags: 'grok' },
  { id: 'fireworks', label: 'Fireworks AI', kind: 'openai-compat', baseUrl: 'https://api.fireworks.ai/inference/v1', model: 'accounts/fireworks/models/llama-v3p3-70b-instruct', keyHint: 'fw_…', keyUrl: 'https://fireworks.ai/account/api-keys', blurb: 'Open models', tags: 'llama' },
  { id: 'cerebras', label: 'Cerebras', kind: 'openai-compat', baseUrl: 'https://api.cerebras.ai/v1', model: 'llama-3.3-70b', keyHint: 'csk-…', keyUrl: 'https://cloud.cerebras.ai/', blurb: 'Very fast open models', tags: 'llama fast' },
];

export const BUILTIN_IDS = CATALOG.filter((p) => p.builtin).map((p) => p.id);
export const catalogById = (id: string) => CATALOG.find((p) => p.id === id);

/** Match on name, id, description and tags. Every word typed must appear somewhere. */
export function searchCatalog(query: string, exclude: string[] = []): CatalogProvider[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return CATALOG.filter((p) => !exclude.includes(p.id)).filter((p) => {
    if (words.length === 0) return true;
    const hay = `${p.label} ${p.id} ${p.blurb} ${p.tags ?? ''}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}

export interface CustomProvider {
  id: string; // "custom-<slug>"
  label: string;
  baseUrl: string;
  model: string;
}

/** Only https, or http on this computer for local model servers. */
export function validBaseUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    const local = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
    if (u.protocol === 'https:' || (u.protocol === 'http:' && local)) return u.toString().replace(/\/+$/, '');
  } catch { /* not a URL */ }
  return null;
}
