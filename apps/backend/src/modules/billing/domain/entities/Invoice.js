import { InvalidInvoiceState } from '../errors/InvalidInvoiceState.js';

export const INVOICE_STATUS = Object.freeze({
  PENDING: 'PENDING',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
});

/**
 * A generated charge against a PlayerMembership for one billing period.
 * Framework-agnostic by construction: no Express/Prisma imports anywhere in
 * this file (enforced mechanically by .dependency-cruiser.js).
 */
export class Invoice {
  constructor({
    id,
    membershipId,
    status = INVOICE_STATUS.PENDING,
    amountCop,
    periodStart,
    periodEnd,
    dueDate,
    issuedAt,
    generatedBy = null,
    paidAmountCop = null,
    paidMethod = null,
    paidBy = null,
    paidAt = null,
    paidNotes = null,
    cancelledAt = null,
    cancelledBy = null,
    cancelReason = null,
    createdAt = null,
  }) {
    this.id = id;
    this.membershipId = membershipId;
    this.status = status;
    this.amountCop = amountCop;
    this.periodStart = periodStart;
    this.periodEnd = periodEnd;
    this.dueDate = dueDate;
    this.issuedAt = issuedAt;
    this.generatedBy = generatedBy;
    this.paidAmountCop = paidAmountCop;
    this.paidMethod = paidMethod;
    this.paidBy = paidBy;
    this.paidAt = paidAt;
    this.paidNotes = paidNotes;
    this.cancelledAt = cancelledAt;
    this.cancelledBy = cancelledBy;
    this.cancelReason = cancelReason;
    this.createdAt = createdAt;
  }

  /**
   * Legal only from PENDING. The amount paid is always this.amountCop --
   * never caller-supplied, matching booking's recordPayment precedent of
   * deriving the amount from the record being paid.
   */
  pay({ method, notes = null, paidBy, now }) {
    if (this.status !== INVOICE_STATUS.PENDING) {
      throw new InvalidInvoiceState(this.status, 'pay');
    }
    this.status = INVOICE_STATUS.PAID;
    this.paidAmountCop = this.amountCop;
    this.paidMethod = method;
    this.paidBy = paidBy;
    this.paidAt = now;
    this.paidNotes = notes;
  }

  /** Legal only from PENDING -- a PAID invoice can't be cancelled. */
  cancel({ cancelledBy, reason, now }) {
    if (this.status !== INVOICE_STATUS.PENDING) {
      throw new InvalidInvoiceState(this.status, 'cancel');
    }
    this.status = INVOICE_STATUS.CANCELLED;
    this.cancelledAt = now;
    this.cancelledBy = cancelledBy;
    this.cancelReason = reason;
  }
}
