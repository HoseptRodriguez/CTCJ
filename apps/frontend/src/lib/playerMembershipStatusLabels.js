import { PLAYER_MEMBERSHIP_STATUS } from '@ctcj/shared';

/** Spanish label per PlayerMembership status (Phase 7's plan-enrollment lifecycle). */
const LABELS = {
  [PLAYER_MEMBERSHIP_STATUS.ACTIVE]: 'Activa',
  [PLAYER_MEMBERSHIP_STATUS.SUSPENDED]: 'Suspendida',
  [PLAYER_MEMBERSHIP_STATUS.ENDED]: 'Finalizada',
};

export function describePlayerMembershipStatus(status) {
  return LABELS[status] ?? status;
}
