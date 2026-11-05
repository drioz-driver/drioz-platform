// Cookie-authenticated requests share one cross-tab lock.
// Reads take it in shared mode, so a price estimate, the offer heartbeat and a dashboard refresh run in parallel
// instead of queueing behind each other. Writes take it exclusively, so a write never races another request
// that could be rotating the session cookie. Supabase's refresh-token reuse window absorbs overlapping reads.
export async function sessionFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const send = () => fetch(input, init);
  const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const read = method === 'GET' || isEstimate(input);
  return typeof navigator !== 'undefined' && navigator.locks
    ? await navigator.locks.request('drioz-session-request', { mode: read ? 'shared' : 'exclusive' }, send)
    : send();
}
// Estimates and coverage checks are POST requests that change nothing.
function isEstimate(input: RequestInfo | URL) {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  return /\/api\/(ops|booking)\/(estimate|coverage|price)$/.test(url);
}
