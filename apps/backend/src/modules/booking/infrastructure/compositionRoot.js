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

import { createPrismaReservationRepository } from './persistence/prismaReservationRepository.js';
import { createPrismaCourtRepository } from './persistence/prismaCourtRepository.js';
import { createPrismaPaymentRepository } from './persistence/prismaPaymentRepository.js';

/**
 * Wires concrete infrastructure adapters to application use cases. Mirrors
 * identity's compositionRoot.js exactly for consistency.
 */
export function buildBookingContainer({ prismaClient = prisma } = {}) {
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
    }),
    createHold: createCreateHold({
      reservationRepository,
      courtRepository,
      clock,
      clubId: DEFAULT_CLUB_ID,
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
  };
}
