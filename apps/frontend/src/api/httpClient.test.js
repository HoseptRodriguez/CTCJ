import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { request, setAccessToken, setUnauthorizedHandler } from './httpClient.js';

function mockFetchOnce(
  response,
  { ok = true, status = 200, contentType = 'application/json' } = {},
) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok,
    status,
    headers: { get: () => contentType },
    json: async () => response,
  });
}

describe('httpClient', () => {
  beforeEach(() => {
    setAccessToken(null);
    setUnauthorizedHandler(null);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('omits the Authorization header when no access token is set', async () => {
    mockFetchOnce({ ok: true });
    await request('/api/foo');
    const [, options] = globalThis.fetch.mock.calls[0];
    expect(options.headers?.Authorization).toBeUndefined();
  });

  it('attaches the Authorization header once an access token is set', async () => {
    setAccessToken('token-abc');
    mockFetchOnce({ ok: true });
    await request('/api/foo');
    const [, options] = globalThis.fetch.mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer token-abc');
  });

  it('always sends credentials: include for the refresh cookie', async () => {
    mockFetchOnce({ ok: true });
    await request('/api/foo');
    const [, options] = globalThis.fetch.mock.calls[0];
    expect(options.credentials).toBe('include');
  });

  it('throws an Error with status/code attached on a non-ok response', async () => {
    mockFetchOnce({ title: 'Not found', code: 'not_found' }, { ok: false, status: 404 });
    await expect(request('/api/foo')).rejects.toMatchObject({
      message: 'Not found',
      status: 404,
      code: 'not_found',
    });
  });

  it('calls the registered unauthorized handler on a 401', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    mockFetchOnce({ title: 'Unauthorized', code: 'unauthenticated' }, { ok: false, status: 401 });
    await expect(request('/api/foo')).rejects.toThrow();
    expect(handler).toHaveBeenCalledOnce();
  });

  it('does not call the unauthorized handler on other error statuses', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    mockFetchOnce({ title: 'Forbidden', code: 'forbidden' }, { ok: false, status: 403 });
    await expect(request('/api/foo')).rejects.toThrow();
    expect(handler).not.toHaveBeenCalled();
  });
});
