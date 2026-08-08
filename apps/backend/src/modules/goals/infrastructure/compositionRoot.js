import { prisma } from '../../../shared/prismaClient.js';
import { systemClock } from '../application/ports/Clock.js';
import { createCreateGoal } from '../application/useCases/createGoal.js';
import { createGetMyGoals } from '../application/useCases/getMyGoals.js';
import { createAbandonGoal } from '../application/useCases/abandonGoal.js';

import { createPrismaGoalRepository } from './persistence/prismaGoalRepository.js';
import {
  createNullCompetitionProgressProvider,
  createNullPerformanceProgressProvider,
  createNullTrainingFrequencyProvider,
} from './adapters/nullAdapters.js';

/**
 * Wires concrete infrastructure adapters to application use cases. Mirrors
 * coaching's/clinical's compositionRoot.js exactly for consistency.
 *
 * `competitionProgressProvider`/`performanceProgressProvider`/
 * `trainingFrequencyProvider` are optional, cross-module dependencies --
 * app.js supplies the real ones, wired to competition's/coaching's/
 * booking's application layers. Left unset (e.g. in a standalone/test
 * call), each defaults to a null-object adapter that returns no data,
 * matching every other cross-module port's documented fail-open default
 * (this is progress display, not an authz gate).
 */
export function buildGoalsContainer({
  prismaClient = prisma,
  competitionProgressProvider = createNullCompetitionProgressProvider(),
  performanceProgressProvider = createNullPerformanceProgressProvider(),
  trainingFrequencyProvider = createNullTrainingFrequencyProvider(),
} = {}) {
  const goalRepository = createPrismaGoalRepository(prismaClient);
  const clock = systemClock;

  return {
    createGoal: createCreateGoal({ goalRepository, clock }),
    getMyGoals: createGetMyGoals({
      goalRepository,
      competitionProgressProvider,
      performanceProgressProvider,
      trainingFrequencyProvider,
      clock,
    }),
    abandonGoal: createAbandonGoal({ goalRepository, clock }),
  };
}
