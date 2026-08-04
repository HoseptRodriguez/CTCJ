import { prisma } from '../../../src/shared/prismaClient.js';

export { prisma };

export const TEST_CLUB_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Invoices first (cascades invoice_lines), then memberships (cascades
 * adjustments), then plans (cascades prices) -- Invoice.membership and
 * PlayerMembership.plan are both ON DELETE RESTRICT, so a row with anything
 * still attached below it can't be deleted before that child is.
 */
export async function resetBilling() {
  await prisma.invoice.deleteMany({});
  await prisma.playerMembership.deleteMany({});
  await prisma.membershipPlan.deleteMany({});
}
