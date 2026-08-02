/**
 * @typedef {{ id: string, amountCop: bigint, method: string, recordedBy: string, recordedAt: Date, notes: string|null }} PaymentRecord
 */

export class PaymentRepository {
  /**
   * Atomically inserts a Payment row and stamps `reservation.payment_id`,
   * but only if the reservation is still CONFIRMED and unpaid at write time.
   * Throws PaymentConflict if that guard fails (a race with another payment
   * attempt or a status change between the caller's read and this write).
   * @param {{ id: string, clubId: string, reservationId: string, amountCop: bigint, method: string, recordedBy: string, notes: string|null, now: Date }} payment
   * @returns {Promise<PaymentRecord>}
   */
  async record(_payment) {
    throw new Error('Not implemented');
  }
}
