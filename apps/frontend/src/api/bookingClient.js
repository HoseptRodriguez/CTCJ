import { holdSchema, confirmSchema, scheduleQuerySchema } from '@ctcj/shared';

import { request } from './httpClient.js';

export const bookingClient = {
  listCourts: () => request('/api/booking/courts'),

  getSchedule: (date) => {
    scheduleQuerySchema.parse({ date });
    return request('/api/booking/schedule', { params: { date } });
  },

  /** @param {{courtId: string, start: string, end: string}} payload ISO-8601 strings with offset */
  hold: (payload) => {
    // holdSchema.parse() transforms start/end into Date objects for the
    // server's own validation -- we only use it here to fail fast on a
    // malformed payload client-side. The request body must stay the
    // original raw ISO strings (Dates don't round-trip through JSON.stringify
    // the way the server expects), so we send `payload`, not `parsed`.
    holdSchema.parse(payload);
    return request('/api/booking/hold', { method: 'POST', body: payload });
  },

  /** @param {{reservationId: string, paymentId: string}} payload */
  confirm: (payload) => {
    confirmSchema.parse(payload);
    return request('/api/booking/confirm', { method: 'POST', body: payload });
  },

  cancel: (reservationId) => request(`/api/booking/${reservationId}/cancel`, { method: 'POST' }),
};
