/**
 * USUARIO -> JUGADOR affiliation request lifecycle. Approval grants the
 * JUGADOR role only -- no plan/category assignment system exists yet.
 */
export const AFFILIATION_REQUEST_STATUS = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
});
