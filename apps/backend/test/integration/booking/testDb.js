import { prisma } from '../../../src/shared/prismaClient.js';

export { prisma };

export const TEST_CLUB_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Must run before any resetUsers() equivalent -- reservations.created_by is
 * ON DELETE RESTRICT against users, so deleting users first while
 * reservations still reference them fails with a FK violation.
 *
 * Reservations first, then payments: reservations.payment_id -> payments.id
 * is the FK direction, so deleting reservations never conflicts with
 * existing payments; deleting payments afterwards is then unblocked.
 */
export async function resetReservations() {
  await prisma.reservation.deleteMany({});
  await prisma.payment.deleteMany({});
}
