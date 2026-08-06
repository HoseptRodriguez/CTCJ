import { prisma } from '../../../shared/prismaClient.js';
import { DEFAULT_CLUB_ID } from '../../../config/club.js';
import { systemClock } from '../application/ports/Clock.js';
import { createScheduleAppointment } from '../application/useCases/scheduleAppointment.js';
import { createCancelAppointment } from '../application/useCases/cancelAppointment.js';
import { createMarkCompleted } from '../application/useCases/markCompleted.js';
import { createMarkNoShow } from '../application/useCases/markNoShow.js';
import { createListAppointments } from '../application/useCases/listAppointments.js';
import { createGetMyAppointments } from '../application/useCases/getMyAppointments.js';
import { createCreateNote } from '../application/useCases/createNote.js';
import { createListPlayerNotes } from '../application/useCases/listPlayerNotes.js';
import { createGetMyNotes } from '../application/useCases/getMyNotes.js';

import { createPrismaAppointmentRepository } from './persistence/prismaAppointmentRepository.js';
import { createPrismaNoteRepository } from './persistence/prismaNoteRepository.js';
import {
  createNullPlayerEligibilityProvider,
  createNullPractitionerEligibilityProvider,
  createNullPlayerDirectoryProvider,
} from './adapters/nullAdapters.js';

/**
 * Wires concrete infrastructure adapters to application use cases. Mirrors
 * every other module's compositionRoot.js exactly for consistency.
 *
 * `playerEligibilityProvider`/`practitionerEligibilityProvider`/
 * `playerDirectoryProvider` are optional, cross-module dependencies --
 * app.js supplies the real ones. Left unset (e.g. in a standalone/test
 * call), they default to null-object adapters matching each port's own
 * documented fail-closed/fail-open default.
 */
export function buildClinicalContainer({
  prismaClient = prisma,
  clock = systemClock,
  clubId = DEFAULT_CLUB_ID,
  playerEligibilityProvider = createNullPlayerEligibilityProvider(),
  practitionerEligibilityProvider = createNullPractitionerEligibilityProvider(),
  playerDirectoryProvider = createNullPlayerDirectoryProvider(),
} = {}) {
  const appointmentRepository = createPrismaAppointmentRepository(prismaClient);
  const noteRepository = createPrismaNoteRepository(prismaClient);

  return {
    scheduleAppointment: createScheduleAppointment({
      appointmentRepository,
      playerEligibilityProvider,
      practitionerEligibilityProvider,
      clock,
      clubId,
    }),
    cancelAppointment: createCancelAppointment({ appointmentRepository, clock }),
    markCompleted: createMarkCompleted({ appointmentRepository, clock }),
    markNoShow: createMarkNoShow({ appointmentRepository, clock }),
    listAppointments: createListAppointments({ appointmentRepository, playerDirectoryProvider }),
    getMyAppointments: createGetMyAppointments({ appointmentRepository, playerDirectoryProvider }),
    createNote: createCreateNote({ noteRepository, playerEligibilityProvider }),
    listPlayerNotes: createListPlayerNotes({ noteRepository }),
    getMyNotes: createGetMyNotes({ noteRepository }),
  };
}
