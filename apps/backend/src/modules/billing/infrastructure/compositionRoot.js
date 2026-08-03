import { prisma } from '../../../shared/prismaClient.js';
import { DEFAULT_CLUB_ID } from '../../../config/club.js';
import { createCreatePlan } from '../application/useCases/createPlan.js';
import { createSetPlanPrice } from '../application/useCases/setPlanPrice.js';
import { createListPlans } from '../application/useCases/listPlans.js';
import { createListPlanPrices } from '../application/useCases/listPlanPrices.js';
import { createEnrollPlayer } from '../application/useCases/enrollPlayer.js';
import { createSetPlayerMembershipStatus } from '../application/useCases/setPlayerMembershipStatus.js';
import { createAddAdjustment } from '../application/useCases/addAdjustment.js';
import { createListPlayerMemberships } from '../application/useCases/listPlayerMemberships.js';
import { createListAdjustments } from '../application/useCases/listAdjustments.js';
import { createGetMyPlayerMemberships } from '../application/useCases/getMyPlayerMemberships.js';

import { createPrismaPlanRepository } from './persistence/prismaPlanRepository.js';
import { createPrismaMembershipRepository } from './persistence/prismaMembershipRepository.js';
import { createPrismaAdjustmentRepository } from './persistence/prismaAdjustmentRepository.js';
import { createNullPlayerEligibilityProvider } from './adapters/nullAdapters.js';

/**
 * Wires concrete infrastructure adapters to application use cases. Mirrors
 * identity's/booking's compositionRoot.js exactly for consistency.
 *
 * `playerEligibilityProvider` is an optional, cross-module dependency
 * (Phase 7) -- app.js supplies the real one, wired to identity's
 * application layer. Left unset (e.g. in a standalone/test call), it
 * defaults to a null-object adapter that never treats anyone as eligible,
 * matching the port's own documented fail-closed default.
 */
export function buildBillingContainer({
  prismaClient = prisma,
  playerEligibilityProvider = createNullPlayerEligibilityProvider(),
} = {}) {
  const planRepository = createPrismaPlanRepository(prismaClient);
  const membershipRepository = createPrismaMembershipRepository(prismaClient);
  const adjustmentRepository = createPrismaAdjustmentRepository(prismaClient);

  return {
    createPlan: createCreatePlan({ planRepository, clubId: DEFAULT_CLUB_ID }),
    setPlanPrice: createSetPlanPrice({ planRepository }),
    listPlans: createListPlans({ planRepository, clubId: DEFAULT_CLUB_ID }),
    listPlanPrices: createListPlanPrices({ planRepository }),
    enrollPlayer: createEnrollPlayer({
      membershipRepository,
      planRepository,
      playerEligibilityProvider,
    }),
    setPlayerMembershipStatus: createSetPlayerMembershipStatus({ membershipRepository }),
    addAdjustment: createAddAdjustment({ adjustmentRepository, membershipRepository }),
    listPlayerMemberships: createListPlayerMemberships({ membershipRepository, planRepository }),
    listAdjustments: createListAdjustments({ adjustmentRepository, membershipRepository }),
    getMyPlayerMemberships: createGetMyPlayerMemberships({ membershipRepository, planRepository }),
  };
}
