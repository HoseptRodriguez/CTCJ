/**
 * Guardian (tutor) <-> minor account linkage lifecycle, admin-approved same
 * as affiliation. See booking's GuardianshipProvider for how canBook is
 * consumed -- canPay is captured but has no runtime effect yet (no
 * self-service online payment flow exists anywhere to gate).
 */
export const GUARDIANSHIP_STATUS = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
});
