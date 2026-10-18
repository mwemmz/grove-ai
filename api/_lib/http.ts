export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Structural types for the classic Vercel Node.js function signature
 * (req: VercelRequest, res: VercelResponse) without depending on
 * @vercel/node. Vercel auto-parses JSON request bodies.
 */
export type HandlerReq = {
  method: string;
  url?: string;
  query: Record<string, string | string[] | undefined>;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};

export type HandlerRes = {
  status(code: number): HandlerRes;
  json(payload: unknown): void;
  setHeader(name: string, value: string): void;
};

export function json(res: HandlerRes, payload: unknown, status = 200): void {
  res.status(status).json(payload);
}

export function requireArrayBody(body: unknown): unknown[] {
  if (!Array.isArray(body)) {
    throw new ApiError(400, 'Request body must be a JSON array');
  }
  return body;
}

export function requireObjectBody(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ApiError(400, 'Request body must be a JSON object');
  }
  return body as Record<string, unknown>;
}
