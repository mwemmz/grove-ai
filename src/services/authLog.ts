/* Reports sign-in steps to the admin trail. Never sends passwords or codes, never blocks or breaks sign-in. */
export function logAuth(e: { flow: string; step: string; ok: boolean; who?: string; code?: string; message?: string }) {
  try {
    void fetch('/api/auth-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(e),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* logging is best effort */
  }
}
