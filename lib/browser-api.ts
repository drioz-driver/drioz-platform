// Serialize cookie-authenticated requests across tabs so refresh-token rotation
// cannot race against another request carrying an older cookie.
export async function sessionFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const send=()=>fetch(input,init);
  return typeof navigator!=='undefined' && navigator.locks
    ? await navigator.locks.request('drioz-session-request',send)
    : send();
}
