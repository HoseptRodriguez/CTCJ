import {
  DATA_REQUEST_DEADLINE_BUSINESS_DAYS,
  DATA_REQUEST_DUE_SOON_BUSINESS_DAYS,
  DATA_REQUEST_STATUS,
  addBusinessDays,
  businessDaysBetween,
  clubDateOf,
} from '@ctcj/shared';

/**
 * Deadline of a request: 10 business days for a consulta, 15 for a reclamo,
 * counted from the day after it was received (club calendar, Colombian
 * holidays). Returns "YYYY-MM-DD".
 */
export function dueOnFor(requestType, receivedAt) {
  return addBusinessDays(clubDateOf(receivedAt), DATA_REQUEST_DEADLINE_BUSINESS_DAYS[requestType]);
}

/**
 * Where an open request stands against its deadline:
 * ANSWERED, OVERDUE (past due), DUE_SOON (3 business days or fewer left,
 * including today) or ON_TIME.
 *
 * @param {{ status: string, dueOn: string }} request  dueOn as "YYYY-MM-DD"
 * @param {Date} now
 */
export function deadlineState({ status, dueOn }, now) {
  if (status === DATA_REQUEST_STATUS.RESPONDIDA) {
    return { alert: 'ANSWERED', businessDaysLeft: null };
  }
  const today = clubDateOf(now);
  const businessDaysLeft = businessDaysBetween(today, dueOn);
  if (today > dueOn) return { alert: 'OVERDUE', businessDaysLeft };
  if (businessDaysLeft <= DATA_REQUEST_DUE_SOON_BUSINESS_DAYS) {
    return { alert: 'DUE_SOON', businessDaysLeft };
  }
  return { alert: 'ON_TIME', businessDaysLeft };
}
