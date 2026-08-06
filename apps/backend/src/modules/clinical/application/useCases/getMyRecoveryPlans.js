/**
 * Self-service: the caller's own PLAYER_VISIBLE recovery plans, scoped
 * server-side to playerId (never client-supplied), matching getMyNotes'
 * exact precedent.
 *
 * @param {{ recoveryPlanRepository: import('../ports/RecoveryPlanRepository.js').RecoveryPlanRepository }} deps
 */
export function createGetMyRecoveryPlans({ recoveryPlanRepository }) {
  /** @param {{ playerId: string }} input */
  return async function getMyRecoveryPlans({ playerId }) {
    const plans = await recoveryPlanRepository.listVisibleByPlayer(playerId);
    return { plans };
  };
}
