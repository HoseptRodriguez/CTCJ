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
import { createCreateRecoveryPlan } from '../application/useCases/createRecoveryPlan.js';
import { createCompleteRecoveryPlan } from '../application/useCases/completeRecoveryPlan.js';
import { createDiscontinueRecoveryPlan } from '../application/useCases/discontinueRecoveryPlan.js';
import { createListRecoveryPlans } from '../application/useCases/listRecoveryPlans.js';
import { createGetMyRecoveryPlans } from '../application/useCases/getMyRecoveryPlans.js';
import { createCreateMedicalHistoryEntry } from '../application/useCases/createMedicalHistoryEntry.js';
import { createResolveMedicalHistoryEntry } from '../application/useCases/resolveMedicalHistoryEntry.js';
import { createListMedicalHistory } from '../application/useCases/listMedicalHistory.js';
import { createGetMyMedicalHistory } from '../application/useCases/getMyMedicalHistory.js';

import { createPrismaAppointmentRepository } from './persistence/prismaAppointmentRepository.js';
import { createPrismaNoteRepository } from './persistence/prismaNoteRepository.js';
import { createPrismaRecoveryPlanRepository } from './persistence/prismaRecoveryPlanRepository.js';
import { createPrismaMedicalHistoryRepository } from './persistence/prismaMedicalHistoryRepository.js';
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
  const recoveryPlanRepository = createPrismaRecoveryPlanRepository(prismaClient);
  const medicalHistoryRepository = createPrismaMedicalHistoryRepository(prismaClient);

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
    createNote: createCreateNote({
      noteRepository,
      playerEligibilityProvider,
      practitionerEligibilityProvider,
    }),
    listPlayerNotes: createListPlayerNotes({ noteRepository, practitionerEligibilityProvider }),
    getMyNotes: createGetMyNotes({ noteRepository }),
    createRecoveryPlan: createCreateRecoveryPlan({
      recoveryPlanRepository,
      playerEligibilityProvider,
      practitionerEligibilityProvider,
      clock,
    }),
    completeRecoveryPlan: createCompleteRecoveryPlan({ recoveryPlanRepository, clock }),
    discontinueRecoveryPlan: createDiscontinueRecoveryPlan({ recoveryPlanRepository, clock }),
    listRecoveryPlans: createListRecoveryPlans({
      recoveryPlanRepository,
      practitionerEligibilityProvider,
    }),
    getMyRecoveryPlans: createGetMyRecoveryPlans({ recoveryPlanRepository }),
    createMedicalHistoryEntry: createCreateMedicalHistoryEntry({
      medicalHistoryRepository,
      playerEligibilityProvider,
      practitionerEligibilityProvider,
      clock,
    }),
    resolveMedicalHistoryEntry: createResolveMedicalHistoryEntry({
      medicalHistoryRepository,
      clock,
    }),
    listMedicalHistory: createListMedicalHistory({
      medicalHistoryRepository,
      practitionerEligibilityProvider,
    }),
    getMyMedicalHistory: createGetMyMedicalHistory({ medicalHistoryRepository }),
  };
}
