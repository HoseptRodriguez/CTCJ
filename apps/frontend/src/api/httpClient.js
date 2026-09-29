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
    error.details = data?.details;
    if (res.status === 401) {
      unauthorizedHandler?.();
    }
    throw error;
  }

  return data;
}

/**
 * For multipart/form-data uploads (avatar upload, Phase 2) -- request()
 * always JSON-stringifies its body, which doesn't fit a file upload. Shares
 * the same in-memory access token and error-handling shape as request()
 * (never sets Content-Type itself -- the browser sets the multipart
 * boundary automatically when given a FormData body).
 */
export async function requestMultipart(path, { method = 'POST', formData } = {}) {
  const url = new URL(path, window.location.origin);
  const headers = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(url, {
    method,
    headers: Object.keys(headers).length ? headers : undefined,
    body: formData,
    credentials: 'include',
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

/**
 * A file the server generates (e.g. a CSV export): downloads it with the
 * session and saves it under the name the server suggests.
 */
export async function downloadFile(path, { params, fallbackName = 'archivo' } = {}) {
  const url = new URL(path, window.location.origin);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== '') url.searchParams.set(key, value);
  }
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
  const res = await fetch(url, { headers, credentials: 'include' });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const error = new Error(data?.title ?? `Request failed with status ${res.status}`);
    error.status = res.status;
    error.code = data?.code;
    if (res.status === 401) unauthorizedHandler?.();
    throw error;
  }
  const name =
    /filename="([^"]+)"/.exec(res.headers.get('content-disposition') ?? '')?.[1] ?? fallbackName;
  const blobUrl = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
  return name;
}

/** The current access token (for third-party upload helpers that need the header). */
export function getAccessToken() {
  return accessToken;
}

/**
 * multipart/form-data with REAL upload progress (fetch can't report it, so
 * this uses XMLHttpRequest). onProgress(0..100) as bytes leave the browser.
 */
export function requestMultipartWithProgress(path, { formData, onProgress, method = 'POST' }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, new URL(path, window.location.origin));
    xhr.withCredentials = true;
    if (accessToken) xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let data = null;
      try {
        data = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        data = null;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve(data);
        return;
      }
      const error = new Error(data?.title ?? `Request failed with status ${xhr.status}`);
      error.status = xhr.status;
      error.code = data?.code;
      if (xhr.status === 401) unauthorizedHandler?.();
      reject(error);
    };
    xhr.onerror = () => reject(Object.assign(new Error('network'), { code: 'network_error' }));
    xhr.send(formData);
  });
}
