import { prisma } from '../../../shared/prismaClient.js';
import { DEFAULT_CLUB_ID } from '../../../config/club.js';
import { systemClock } from '../application/ports/Clock.js';
import { createListCourts } from '../application/useCases/listCourts.js';
import { createGetSchedule } from '../application/useCases/getSchedule.js';
import { createCreateHold } from '../application/useCases/createHold.js';
import { createConfirmReservation } from '../application/useCases/confirmReservation.js';
import { createCancelReservation } from '../application/useCases/cancelReservation.js';
import { createSetCourtPrice } from '../application/useCases/setCourtPrice.js';
import { createRecordPayment } from '../application/useCases/recordPayment.js';
import { createListPaymentsByDateRange } from '../application/useCases/listPaymentsByDateRange.js';
import { createGetOverdueBookingPolicy } from '../application/useCases/getOverdueBookingPolicy.js';
import { createSetOverdueBookingPolicy } from '../application/useCases/setOverdueBookingPolicy.js';

import { createPrismaReservationRepository } from './persistence/prismaReservationRepository.js';
import { createPrismaCourtRepository } from './persistence/prismaCourtRepository.js';
import { createPrismaPaymentRepository } from './persistence/prismaPaymentRepository.js';
import {
  createNullMembershipStatusProvider,
  createStaticBookingPolicySettings,
  createNullGuardianshipProvider,
} from './adapters/nullAdapters.js';

/**
 * Wires concrete infrastructure adapters to application use cases. Mirrors
 * identity's compositionRoot.js exactly for consistency.
 *
 * `membershipStatusProvider`/`bookingPolicySettings`/`guardianshipProvider`
 * are optional, cross-module dependencies (Phase 5/6) -- app.js supplies the
 * real ones, wired to identity's application layer. Left unset (e.g. in a
 * standalone/test call), they default to null-object adapters that never
 * block a booking (or never authorize booking-for-others), matching each
 * policy's own documented safe/permissive default.
 */
export function buildBookingContainer({
  prismaClient = prisma,
  membershipStatusProvider = createNullMembershipStatusProvider(),
  bookingPolicySettings = createStaticBookingPolicySettings(false),
  guardianshipProvider = createNullGuardianshipProvider(),
} = {}) {
  const courtRepository = createPrismaCourtRepository(prismaClient);
  const reservationRepository = createPrismaReservationRepository(prismaClient);
  const paymentRepository = createPrismaPaymentRepository(prismaClient);
  const clock = systemClock;

  return {
    listCourts: createListCourts({ courtRepository, clubId: DEFAULT_CLUB_ID }),
    getSchedule: createGetSchedule({
      reservationRepository,
      courtRepository,
      clubId: DEFAULT_CLUB_ID,
      membershipStatusProvider,
    }),
    createHold: createCreateHold({
      reservationRepository,
      courtRepository,
      clock,
      clubId: DEFAULT_CLUB_ID,
      membershipStatusProvider,
      bookingPolicySettings,
      guardianshipProvider,
    }),
    confirmReservation: createConfirmReservation({ reservationRepository, clock }),
    cancelReservation: createCancelReservation({ reservationRepository, clock }),
    setCourtPrice: createSetCourtPrice({ courtRepository, clubId: DEFAULT_CLUB_ID }),
    recordPayment: createRecordPayment({
      reservationRepository,
      paymentRepository,
      clock,
      clubId: DEFAULT_CLUB_ID,
    }),
    listPaymentsByDateRange: createListPaymentsByDateRange({ paymentRepository }),
    getOverdueBookingPolicy: createGetOverdueBookingPolicy({ bookingPolicySettings }),
    setOverdueBookingPolicy: createSetOverdueBookingPolicy({ bookingPolicySettings }),
  };
}
