import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { bookingClient } from './bookingClient.js';
import { setAccessToken } from './httpClient.js';

function mockFetchOnce(response = {}) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: async () => response,
  });
}

const VALID_HOLD = {
  courtId: '11111111-1111-1111-1111-111111111111',
  start: '2026-08-10T15:00:00.000Z',
  end: '2026-08-10T16:00:00.000Z',
};

describe('bookingClient', () => {
  beforeEach(() => {
    setAccessToken('token-abc');
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('listCourts() calls GET /api/booking/courts', async () => {
    mockFetchOnce({ courts: [] });
    await bookingClient.listCourts();
    const [url, options] = globalThis.fetch.mock.calls[0];
    expect(String(url)).toContain('/api/booking/courts');
    expect(options.method).toBe('GET');
  });

  it('getSchedule() calls GET /api/booking/schedule with the date query param', async () => {
    mockFetchOnce({ reservations: [] });
    await bookingClient.getSchedule('2026-08-10');
    const [url] = globalThis.fetch.mock.calls[0];
    expect(String(url)).toContain('date=2026-08-10');
  });

  it('getSchedule() throws before fetch on a malformed date, without calling fetch', () => {
    globalThis.fetch = vi.fn();
    expect(() => bookingClient.getSchedule('not-a-date')).toThrow();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('hold() sends the original raw ISO strings, not the zod-transformed Date objects', async () => {
    mockFetchOnce({ reservationId: 'res-1' });
    await bookingClient.hold(VALID_HOLD);
    const [, options] = globalThis.fetch.mock.calls[0];
    const sentBody = JSON.parse(options.body);
    expect(sentBody).toEqual(VALID_HOLD);
    expect(typeof sentBody.start).toBe('string');
  });

  it('hold() throws before fetch on an invalid payload (bad courtId)', () => {
    globalThis.fetch = vi.fn();
    expect(() => bookingClient.hold({ ...VALID_HOLD, courtId: 'not-a-uuid' })).toThrow();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('confirm() calls POST /api/booking/confirm with reservationId + paymentId', async () => {
    mockFetchOnce({ status: 'CONFIRMED' });
    const payload = { reservationId: VALID_HOLD.courtId, paymentId: VALID_HOLD.courtId };
    await bookingClient.confirm(payload);
    const [url, options] = globalThis.fetch.mock.calls[0];
    expect(String(url)).toContain('/api/booking/confirm');
    expect(JSON.parse(options.body)).toEqual(payload);
  });

  it('cancel() calls POST /api/booking/:id/cancel', async () => {
    mockFetchOnce({ status: 'CANCELLED' });
    await bookingClient.cancel('res-123');
    const [url, options] = globalThis.fetch.mock.calls[0];
    expect(String(url)).toContain('/api/booking/res-123/cancel');
    expect(options.method).toBe('POST');
  });
});
