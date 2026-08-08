import { prisma } from '../../../shared/prismaClient.js';
import { systemClock } from '../application/ports/Clock.js';
import { createCreateChallenge } from '../application/useCases/createChallenge.js';
import { createGetMyChallenges } from '../application/useCases/getMyChallenges.js';
import { createAcceptChallenge } from '../application/useCases/acceptChallenge.js';
import { createRejectChallenge } from '../application/useCases/rejectChallenge.js';
import { createCancelChallenge } from '../application/useCases/cancelChallenge.js';
import { createSubmitMatchScore } from '../application/useCases/submitMatchScore.js';

import { createPrismaChallengeRepository } from './persistence/prismaChallengeRepository.js';
import { createPrismaChallengeMatchResultRepository } from './persistence/prismaChallengeMatchResultRepository.js';
import {
  createNullPlayerEligibilityProvider,
  createNullPlayerDirectoryProvider,
  createNullNotificationSender,
  createNullMatchRecorder,
} from './adapters/nullAdapters.js';

/**
 * Wires concrete infrastructure adapters to application use cases. Mirrors
 * goals'/coaching's compositionRoot.js exactly for consistency.
 *
 * `playerEligibilityProvider`/`playerDirectoryProvider`/`notificationSender`/
 * `matchRecorder` are optional, cross-module dependencies -- app.js
 * supplies the real ones, wired to identity's, notifications', and
 * competition's application layers (`matchRecorder` specifically via a
 * build-then-patch step, since challenges is built before competition --
 * see app.js). Left unset (e.g. in a standalone/test call), each defaults
 * to a null-object adapter matching every other cross-module port's
 * documented fail-open/fail-closed default -- `matchRecorder`'s null
 * default is the one exception that fails loud, see nullAdapters.js.
 */
export function buildChallengesContainer({
  prismaClient = prisma,
  playerEligibilityProvider = createNullPlayerEligibilityProvider(),
  playerDirectoryProvider = createNullPlayerDirectoryProvider(),
  notificationSender = createNullNotificationSender(),
  matchRecorder = createNullMatchRecorder(),
} = {}) {
  const challengeRepository = createPrismaChallengeRepository(prismaClient);
  const challengeMatchResultRepository = createPrismaChallengeMatchResultRepository(prismaClient);
  const clock = systemClock;

  const container = {
    createChallenge: createCreateChallenge({
      challengeRepository,
      playerEligibilityProvider,
      playerDirectoryProvider,
      notificationSender,
      clock,
    }),
    getMyChallenges: createGetMyChallenges({
      challengeRepository,
      playerDirectoryProvider,
      challengeMatchResultRepository,
    }),
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
    submitMatchScore: createSubmitMatchScore({
      challengeRepository,
      challengeMatchResultRepository,
      matchRecorder,
      notificationSender,
      clock,
    }),
  };

  // Escape hatch for app.js's build-then-patch step (matches the test
  // fakes' own `_seed`-style underscore-prefixed convention for
  // internal-only extras): challenges is built before competition exists,
  // so `matchRecorder` above is necessarily the null default at
  // construction time. Once competitionContainer exists, app.js calls this
  // to rebuild just submitMatchScore with the real adapter, reusing the
  // same repositories/notificationSender/clock closed over above -- not a
  // whole new container, unlike identity's getMyAchievements patch.
  container._rebuildSubmitMatchScoreWithMatchRecorder = (realMatchRecorder) =>
    createSubmitMatchScore({
      challengeRepository,
      challengeMatchResultRepository,
      matchRecorder: realMatchRecorder,
      notificationSender,
      clock,
    });

  return container;
}
