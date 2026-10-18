type TokenProvider = () => Promise<string | null>;

let tokenProvider: TokenProvider | null = null;

/** Wired once by the app after Clerk loads; every request attaches the session token. */
export function setTokenProvider(provider: TokenProvider): void {
  tokenProvider = provider;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = tokenProvider ? await tokenProvider() : null;
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    let detail = '';
    try {
      const body = (await res.json()) as { error?: string };
      detail = body.error ? `: ${body.error}` : '';
    } catch {
      // non-JSON error body
    }
    throw new Error(`API request failed (${res.status})${detail}`);
  }

  return (await res.json()) as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path);
}

export function apiPut<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });
}

export function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' });
}
