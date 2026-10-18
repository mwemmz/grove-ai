import { verifyToken } from '@clerk/backend';
import { catalogById } from '../src/shared/providerCatalog.js';

/* Relay for AI providers whose servers refuse browser calls (CORS), such as NVIDIA.
   - Signed-in students only (Clerk session token).
   - Can only reach OpenAI-compatible hosts listed in the shared catalog, never a URL from the request.
   - The student's key arrives in the request body, goes straight upstream, and is never stored or logged. */

type Req = { method?: string; headers?: Record<string, string | string[] | undefined>; body?: unknown };
type Res = { statusCode: number; setHeader(n: string, v: string): void; end(chunk?: string): void };

export const config = { maxDuration: 30 };

const send = (res: Res, status: number, payload: unknown) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
};

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });

  const raw = req.headers?.authorization;
  const header = Array.isArray(raw) ? raw[0] : raw;
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!token || !secretKey) return send(res, 401, { error: 'Sign in to use this provider.' });
  try {
    await verifyToken(token, { secretKey });
  } catch {
    return send(res, 401, { error: 'Invalid or expired session.' });
  }

  const body = (typeof req.body === 'object' && req.body ? req.body : {}) as { provider?: string; apiKey?: string; payload?: unknown };
  const def = body.provider ? catalogById(body.provider) : undefined;
  if (!def || def.kind !== 'openai-compat' || !def.baseUrl) return send(res, 400, { error: 'Unknown provider.' });
  if (!body.apiKey || typeof body.apiKey !== 'string' || body.apiKey.length > 500) return send(res, 400, { error: 'Missing key.' });
  const payload = JSON.stringify(body.payload ?? {});
  if (payload.length > 250_000) return send(res, 413, { error: 'Request too large.' });

  try {
    const upstream = await fetch(`${def.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${body.apiKey}` },
      body: payload,
      signal: AbortSignal.timeout(25_000),
    });
    let data: unknown = null;
    try { data = await upstream.json(); } catch { /* upstream sent no JSON */ }
    return send(res, 200, { status: upstream.status, data });
  } catch {
    return send(res, 200, { status: 504, data: { error: { message: 'The provider did not answer in time.' } } });
  }
}
