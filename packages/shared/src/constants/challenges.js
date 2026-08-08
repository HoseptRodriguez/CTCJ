export const CHALLENGE_STATUS = Object.freeze({
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  // Set once both players submit agreeing scores and the result is
  // recorded into competition -- see ChallengeMatchResult.
  COMPLETED: 'COMPLETED',
});
