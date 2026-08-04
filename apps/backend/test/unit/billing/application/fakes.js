import { randomUUID } from 'node:crypto';

import { PlayerMembership } from '../../../../src/modules/billing/domain/entities/PlayerMembership.js';
import { Invoice } from '../../../../src/modules/billing/domain/entities/Invoice.js';

function cloneMembership(membership) {
  return new PlayerMembership({ ...membership });
}

function cloneInvoice(invoice) {
  const clone = new Invoice({ ...invoice });
  clone.lines = invoice.lines;
  return clone;
}

export function createFakePlanRepository(plans = []) {
  const byId = new Map(plans.map((p) => [p.id, p]));
  const pricesByPlan = new Map(); // planId -> PriceRow[]

  return {
    async create({ clubId, code, name, description }) {
      const id = randomUUID();
      const plan = { id, clubId, code, name, description, isActive: true, createdAt: new Date() };
      byId.set(id, plan);
      pricesByPlan.set(id, []);
      return plan;
    },
    async findById(id) {
      return byId.get(id) ?? null;
    },
    async findByCode(clubId, code) {
      for (const plan of byId.values()) {
        if (plan.clubId === clubId && plan.code === code) return plan;
      }
      return null;
    },
    async listByClub(clubId) {
      return Array.from(byId.values()).filter((p) => p.clubId === clubId);
    },
    async findCurrentPrice(planId) {
      const prices = pricesByPlan.get(planId) ?? [];
      return prices.find((p) => p.validTo === null) ?? null;
    },
    async listPrices(planId) {
      return (pricesByPlan.get(planId) ?? []).slice().sort((a, b) => b.validFrom - a.validFrom);
    },
    async supersedePrice(planId, { closePrevious, newRow, createdBy }) {
      const prices = pricesByPlan.get(planId) ?? [];
      if (closePrevious) {
        const row = prices.find((p) => p.id === closePrevious.id);
        if (row) row.validTo = closePrevious.validTo;
      }
      const inserted = {
        id: randomUUID(),
        planId,
        basePriceCop: newRow.basePriceCop,
        validFrom: newRow.validFrom,
        validTo: null,
        createdBy,
        createdAt: new Date(),
      };
      prices.push(inserted);
      pricesByPlan.set(planId, prices);
      return inserted;
    },
  };
}

export function createFakeMembershipRepository() {
  const byId = new Map();

  return {
    async create({ playerId, planId, startDate, billingDay, frequency }) {
      const id = randomUUID();
      const membership = new PlayerMembership({
        id,
        playerId,
        planId,
        startDate,
        billingDay,
        frequency,
      });
      byId.set(id, membership);
      return cloneMembership(membership);
    },
    async findById(id) {
      const membership = byId.get(id);
      return membership ? cloneMembership(membership) : null;
    },
    async update(membership) {
      byId.set(membership.id, cloneMembership(membership));
      return cloneMembership(membership);
    },
    async listByPlayer(playerId) {
      return Array.from(byId.values())
        .filter((m) => m.playerId === playerId)
        .map(cloneMembership);
    },
  };
}

export function createFakeAdjustmentRepository() {
  const byId = new Map();

  return {
    async create({
      membershipId,
      adjustmentType,
      value,
      reason,
      validFrom,
      validTo,
      authorizedBy,
    }) {
      const id = randomUUID();
      const record = {
        id,
        membershipId,
        adjustmentType,
        value,
        reason,
        validFrom,
        validTo,
        authorizedBy,
        createdAt: new Date(),
      };
      byId.set(id, record);
      return record;
    },
    async listByMembership(membershipId) {
      return Array.from(byId.values()).filter((a) => a.membershipId === membershipId);
    },
  };
}

/** @param {Set<string>} eligiblePlayerIds */
export function createFakePlayerEligibilityProvider(eligiblePlayerIds = new Set()) {
  return {
    async isEligiblePlayer(userId) {
      return eligiblePlayerIds.has(userId);
    },
  };
}

export function createFakeInvoiceRepository() {
  const byId = new Map();

  return {
    async create(
      { membershipId, amountCop, periodStart, periodEnd, dueDate, issuedAt, generatedBy },
      lines,
    ) {
      const id = randomUUID();
      const invoice = new Invoice({
        id,
        membershipId,
        amountCop,
        periodStart,
        periodEnd,
        dueDate,
        issuedAt,
        generatedBy,
      });
      invoice.lines = lines.map((line) => ({ id: randomUUID(), ...line }));
      byId.set(id, invoice);
      return cloneInvoice(invoice);
    },
    async findById(id) {
      const invoice = byId.get(id);
      return invoice ? cloneInvoice(invoice) : null;
    },
    async findByMembershipAndPeriod(membershipId, periodStart) {
      for (const invoice of byId.values()) {
        if (
          invoice.membershipId === membershipId &&
          invoice.periodStart.getTime() === periodStart.getTime()
        ) {
          return cloneInvoice(invoice);
        }
      }
      return null;
    },
    async listByMembership(membershipId) {
      return Array.from(byId.values())
        .filter((invoice) => invoice.membershipId === membershipId)
        .map(cloneInvoice);
    },
    async update(invoice) {
      const stored = byId.get(invoice.id);
      const merged = cloneInvoice(invoice);
      merged.lines = stored?.lines;
      byId.set(invoice.id, merged);
      return cloneInvoice(merged);
    },
  };
}

export function createFakeClock(now = new Date('2026-03-05T12:00:00.000Z')) {
  return { now: () => now };
}
