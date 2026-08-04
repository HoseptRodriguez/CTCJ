/**
 * @typedef {import('../../domain/entities/Invoice.js').Invoice} Invoice
 * @typedef {{ id: string, description: string, amountCop: bigint }} InvoiceLineRow
 */

export class InvoiceRepository {
  /**
   * Persists a new invoice and its lines transactionally.
   * @param {{ membershipId: string, amountCop: bigint, periodStart: Date, periodEnd: Date, dueDate: Date, issuedAt: Date, generatedBy: string|null }} invoiceInput
   * @param {Array<{ description: string, amountCop: bigint }>} lines
   * @returns {Promise<Invoice & { lines: InvoiceLineRow[] }>}
   */
  async create(_invoiceInput, _lines) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<(Invoice & { lines: InvoiceLineRow[] })|null>} */
  async findById(_id) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<Invoice|null>} used to enforce one invoice per membership+period */
  async findByMembershipAndPeriod(_membershipId, _periodStart) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<Invoice[]>} newest period first, no lines (list view) */
  async listByMembership(_membershipId) {
    throw new Error('Not implemented');
  }

  /** Persists pay()/cancel() field changes made via the domain entity's transition methods. @returns {Promise<Invoice>} */
  async update(_invoice) {
    throw new Error('Not implemented');
  }

  /**
   * Club-wide listing (Phase 9 financial dashboard), no lines -- a dashboard
   * row doesn't need line-item detail. `paidFrom`/`paidTo` filter on `paidAt`
   * in [paidFrom, paidTo) (when money was actually received), not `issuedAt`.
   * @param {{ status?: string, paidFrom?: Date, paidTo?: Date }} filters
   * @returns {Promise<Invoice[]>}
   */
  async listAll(_filters) {
    throw new Error('Not implemented');
  }

  /** @param {{ status?: string, paidFrom?: Date, paidTo?: Date }} filters @returns {Promise<{ totalCop: bigint, count: number }>} */
  async getTotals(_filters) {
    throw new Error('Not implemented');
  }
}
