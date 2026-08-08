import { prisma } from '../../../shared/prismaClient.js';
import { systemClock } from '../application/ports/Clock.js';
import { createCreateChallenge } from '../application/useCases/createChallenge.js';
import { createGetMyChallenges } from '../application/useCases/getMyChallenges.js';
import { createAcceptChallenge } from '../application/useCases/acceptChallenge.js';
import { createRejectChallenge } from '../application/useCases/rejectChallenge.js';
import { createCancelChallenge } from '../application/useCases/cancelChallenge.js';

import { createPrismaChallengeRepository } from './persistence/prismaChallengeRepository.js';
import {
  createNullPlayerEligibilityProvider,
  createNullPlayerDirectoryProvider,
  createNullNotificationSender,
} from './adapters/nullAdapters.js';

/**
 * Wires concrete infrastructure adapters to application use cases. Mirrors
 * goals'/coaching's compositionRoot.js exactly for consistency.
 *
 * `playerEligibilityProvider`/`playerDirectoryProvider`/`notificationSender`
 * are optional, cross-module dependencies -- app.js supplies the real ones,
 * wired to identity's and notifications' application layers. Left unset
 * (e.g. in a standalone/test call), each defaults to a null-object adapter
 * matching every other cross-module port's documented fail-open/fail-closed
 * default.
 */
export function buildChallengesContainer({
  prismaClient = prisma,
  playerEligibilityProvider = createNullPlayerEligibilityProvider(),
  playerDirectoryProvider = createNullPlayerDirectoryProvider(),
  notificationSender = createNullNotificationSender(),
} = {}) {
  const challengeRepository = createPrismaChallengeRepository(prismaClient);
  const clock = systemClock;

  return {
    createChallenge: createCreateChallenge({
      challengeRepository,
      playerEligibilityProvider,
      playerDirectoryProvider,
      notificationSender,
      clock,
    }),
    getMyChallenges: createGetMyChallenges({ challengeRepository, playerDirectoryProvider }),
    acceptChallenge: createAcceptChallenge({
      challengeRepository,
      playerDirectoryProvider,
      notificationSender,
      clock,
    }),
    rejectChallenge: createRejectChallenge({
      challengeRepository,
      playerDirectoryProvider,
      notificationSender,
      clock,
    }),
    cancelChallenge: createCancelChallenge({
      challengeRepository,
      playerDirectoryProvider,
      notificationSender,
      clock,
    }),
  };
}
