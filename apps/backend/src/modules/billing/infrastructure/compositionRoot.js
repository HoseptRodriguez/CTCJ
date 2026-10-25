import { prisma } from '../../../shared/prismaClient.js';
import { DEFAULT_CLUB_ID } from '../../../config/club.js';
import { createCreatePlan } from '../application/useCases/createPlan.js';
import { createSetPlanPrice } from '../application/useCases/setPlanPrice.js';
import { createListPlans } from '../application/useCases/listPlans.js';
import { createListPlanPrices } from '../application/useCases/listPlanPrices.js';
import { createUpdatePlan } from '../application/useCases/updatePlan.js';
import { createSetPlanActive } from '../application/useCases/setPlanActive.js';
import { createCancelScheduledPlanPrice } from '../application/useCases/cancelScheduledPlanPrice.js';
import { createGetPriceNoticeDays } from '../application/useCases/getPriceNoticeDays.js';
import { createSetPriceNoticeDays } from '../application/useCases/setPriceNoticeDays.js';
import { createEnrollPlayer } from '../application/useCases/enrollPlayer.js';
import { createSetPlayerMembershipStatus } from '../application/useCases/setPlayerMembershipStatus.js';
import { createAddAdjustment } from '../application/useCases/addAdjustment.js';
import { createListPlayerMemberships } from '../application/useCases/listPlayerMemberships.js';
import { createListAdjustments } from '../application/useCases/listAdjustments.js';
import { createGetMyPlayerMemberships } from '../application/useCases/getMyPlayerMemberships.js';
import { createGenerateInvoice } from '../application/useCases/generateInvoice.js';
import { createGetInvoice } from '../application/useCases/getInvoice.js';
import { createListInvoicesByMembership } from '../application/useCases/listInvoicesByMembership.js';
import { createRecordInvoicePayment } from '../application/useCases/recordInvoicePayment.js';
import { createCancelInvoice } from '../application/useCases/cancelInvoice.js';
import { createGetMyInvoices } from '../application/useCases/getMyInvoices.js';
import { createListInvoices } from '../application/useCases/listInvoices.js';
import { createGetMonthlyRevenue } from '../application/useCases/getMonthlyRevenue.js';
import { systemClock } from '../application/ports/Clock.js';

import { createPrismaPlanRepository } from './persistence/prismaPlanRepository.js';
import { createPrismaMembershipRepository } from './persistence/prismaMembershipRepository.js';
import { createPrismaAdjustmentRepository } from './persistence/prismaAdjustmentRepository.js';
import { createPrismaInvoiceRepository } from './persistence/prismaInvoiceRepository.js';
import { createPrismaBillingAuditLog } from './persistence/prismaBillingAuditLog.js';
import {
  createDefaultBillingSettings,
  createNullNotificationSender,
  createNullPlayerEligibilityProvider,
  createNullPlayerDirectoryProvider,
} from './adapters/nullAdapters.js';

/**
 * Wires concrete infrastructure adapters to application use cases. Mirrors
 * identity's/booking's compositionRoot.js exactly for consistency.
 *
 * `playerEligibilityProvider` (Phase 7) and `playerDirectoryProvider`
 * (Phase 9) are optional, cross-module dependencies -- app.js supplies the
 * real ones, wired to identity's application layer. Left unset (e.g. in a
 * standalone/test call), they default to null-object adapters matching
 * each port's own documented safe default (fail-closed for eligibility,
 * fail-open/empty-map for directory lookups -- see nullAdapters.js).
 * `billingSettings` (the price-change notice, a SystemSetting owned by
 * identity) and `notificationSender` follow the same pattern: 30 days and
 * no notifications when unwired.
 */
export function buildBillingContainer({
  prismaClient = prisma,
  playerEligibilityProvider = createNullPlayerEligibilityProvider(),
  playerDirectoryProvider = createNullPlayerDirectoryProvider(),
  billingSettings = createDefaultBillingSettings(),
  notificationSender = createNullNotificationSender(),
  clock = systemClock,
} = {}) {
  const planRepository = createPrismaPlanRepository(prismaClient);
  const membershipRepository = createPrismaMembershipRepository(prismaClient);
  const adjustmentRepository = createPrismaAdjustmentRepository(prismaClient);
  const invoiceRepository = createPrismaInvoiceRepository(prismaClient);
  const auditLog = createPrismaBillingAuditLog(prismaClient, DEFAULT_CLUB_ID);

  return {
    createPlan: createCreatePlan({ planRepository, auditLog, clubId: DEFAULT_CLUB_ID }),
    updatePlan: createUpdatePlan({ planRepository, auditLog, clubId: DEFAULT_CLUB_ID }),
    setPlanActive: createSetPlanActive({ planRepository, auditLog }),
    setPlanPrice: createSetPlanPrice({
      planRepository,
      membershipRepository,
      billingSettings,
      notificationSender,
      auditLog,
      clock,
    }),
    cancelScheduledPlanPrice: createCancelScheduledPlanPrice({ planRepository, auditLog, clock }),
    getPriceNoticeDays: createGetPriceNoticeDays({ billingSettings }),
    setPriceNoticeDays: createSetPriceNoticeDays({ billingSettings, auditLog }),
    listPlans: createListPlans({
      planRepository,
      membershipRepository,
      billingSettings,
      clock,
      clubId: DEFAULT_CLUB_ID,
    }),
    listPlanPrices: createListPlanPrices({ planRepository, playerDirectoryProvider, clock }),
    enrollPlayer: createEnrollPlayer({
      membershipRepository,
      planRepository,
      playerEligibilityProvider,
    }),
    setPlayerMembershipStatus: createSetPlayerMembershipStatus({ membershipRepository }),
    addAdjustment: createAddAdjustment({ adjustmentRepository, membershipRepository }),
    listPlayerMemberships: createListPlayerMemberships({
      membershipRepository,
      planRepository,
      clock,
    }),
    listAdjustments: createListAdjustments({ adjustmentRepository, membershipRepository }),
    getMyPlayerMemberships: createGetMyPlayerMemberships({
      membershipRepository,
      planRepository,
      clock,
    }),
    generateInvoice: createGenerateInvoice({
      membershipRepository,
      planRepository,
      adjustmentRepository,
      invoiceRepository,
      clock,
    }),
    getInvoice: createGetInvoice({ invoiceRepository }),
    listInvoicesByMembership: createListInvoicesByMembership({ invoiceRepository }),
    recordInvoicePayment: createRecordInvoicePayment({ invoiceRepository, clock }),
    cancelInvoice: createCancelInvoice({ invoiceRepository, clock }),
    getMyInvoices: createGetMyInvoices({ membershipRepository, invoiceRepository }),
    listInvoices: createListInvoices({ invoiceRepository, playerDirectoryProvider, clock }),
    getMonthlyRevenue: createGetMonthlyRevenue({ invoiceRepository, clock }),
  };
}
