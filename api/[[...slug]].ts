import { handleRequest } from './_lib/router';
import { ApiError, HandlerReq, HandlerRes } from './_lib/http';

type VercelReq = {
  method?: string;
  url?: string;
  query?: Record<string, string | string[] | undefined>;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type VercelRes = {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(chunk?: string): void;
};

export default async function handler(req: VercelReq, res: VercelRes) {
  const headers: Record<string, string | string[] | undefined> = {};
  for (const [k, v] of Object.entries(req.headers ?? {})) {
    headers[k.toLowerCase()] = v;
  }

  const handlerRes: HandlerRes = {
    status(code: number) {
      res.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(payload));
    },
    setHeader(name: string, value: string) {
      res.setHeader(name, value);
    },
  };

  const handlerReq: HandlerReq = {
    method: (req.method ?? 'GET') + '',
    url: req.url ?? '/api',
    query: req.query ?? {},
    headers,
    body: req.body,
  };

  try {
    await handleRequest(handlerReq, handlerRes);
  } catch (err) {
    if (err instanceof ApiError) {
      res.statusCode = err.status;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: err.message }));
      return;
    }
    console.error('API error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}
