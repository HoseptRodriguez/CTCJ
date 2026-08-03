import { prisma } from '../../../src/shared/prismaClient.js';

export { prisma };

export const TEST_CLUB_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Memberships first (cascades adjustments), then plans (cascades prices) --
 * PlayerMembership.plan is ON DELETE RESTRICT, so a plan with any
 * memberships still attached can't be deleted before they are.
 */
export async function resetBilling() {
  await prisma.playerMembership.deleteMany({});
  await prisma.membershipPlan.deleteMany({});
}
