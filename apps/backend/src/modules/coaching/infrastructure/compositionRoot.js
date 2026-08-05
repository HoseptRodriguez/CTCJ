import { prisma } from '../../../shared/prismaClient.js';
import { createCreateNote } from '../application/useCases/createNote.js';
import { createListPlayerNotes } from '../application/useCases/listPlayerNotes.js';
import { createGetMyNotes } from '../application/useCases/getMyNotes.js';
import { createRecordPerformanceSnapshot } from '../application/useCases/recordPerformanceSnapshot.js';
import { createListPlayerPerformance } from '../application/useCases/listPlayerPerformance.js';
import { createGetMyPerformance } from '../application/useCases/getMyPerformance.js';

import { createPrismaCoachNoteRepository } from './persistence/prismaCoachNoteRepository.js';
import { createPrismaPerformanceRatingRepository } from './persistence/prismaPerformanceRatingRepository.js';
import { createNullPlayerEligibilityProvider } from './adapters/nullAdapters.js';

/**
 * Wires concrete infrastructure adapters to application use cases. Mirrors
 * billing's/booking's compositionRoot.js exactly for consistency.
 *
 * `playerEligibilityProvider` is an optional, cross-module dependency
 * (Phase 10) -- app.js supplies the real one, wired to identity's
 * application layer. Left unset (e.g. in a standalone/test call), it
 * defaults to a null-object adapter that never treats anyone as eligible,
 * matching the port's own documented fail-closed default.
 */
export function buildCoachingContainer({
  prismaClient = prisma,
  playerEligibilityProvider = createNullPlayerEligibilityProvider(),
} = {}) {
  const coachNoteRepository = createPrismaCoachNoteRepository(prismaClient);
  const performanceRatingRepository = createPrismaPerformanceRatingRepository(prismaClient);

  return {
    createNote: createCreateNote({ coachNoteRepository, playerEligibilityProvider }),
    listPlayerNotes: createListPlayerNotes({ coachNoteRepository }),
    getMyNotes: createGetMyNotes({ coachNoteRepository }),
    recordPerformanceSnapshot: createRecordPerformanceSnapshot({
      performanceRatingRepository,
      playerEligibilityProvider,
    }),
    listPlayerPerformance: createListPlayerPerformance({ performanceRatingRepository }),
    getMyPerformance: createGetMyPerformance({ performanceRatingRepository }),
  };
}
