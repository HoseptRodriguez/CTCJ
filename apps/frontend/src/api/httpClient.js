/**
 * Thin fetch wrapper -- our API surface doesn't need axios's interceptor
 * machinery, so a plain fetch client keeps one less dependency.
 *
 * Extracted from authClient.js so other clients (bookingClient.js, etc.)
 * share the same request/error-handling conventions instead of duplicating
 * fetch logic per module.
 */
let accessToken = null;

/** Called by AuthContext whenever the in-memory access token changes. */
export function setAccessToken(token) {
  accessToken = token;
}

let unauthorizedHandler = null;

/**
 * Called by AuthContext to react app-wide to any 401 (e.g. an access token
 * that expired mid-session) -- just enough to flip the UI to logged-out
 * cleanly, not a queued-retry system.
 */
export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn;
}

export async function request(path, { method = 'GET', body, params } = {}) {
  const url = new URL(path, window.location.origin);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(url, {
    method,
    headers: Object.keys(headers).length ? headers : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include', // sends/receives the HttpOnly refresh cookie
  });

  const contentType = res.headers.get('content-type') ?? '';
  const data = contentType.includes('application/json') ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const error = new Error(data?.title ?? `Request failed with status ${res.status}`);
    error.status = res.status;
    error.code = data?.code;
    if (res.status === 401) {
      unauthorizedHandler?.();
    }
    throw error;
  }

  return data;
}
