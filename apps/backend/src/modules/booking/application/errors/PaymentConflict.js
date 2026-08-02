/**
 * Internal-only sentinel: thrown by PaymentRepository.record() when the
 * reservation stopped being CONFIRMED-and-unpaid between the in-memory
 * assertPayable() check and the DB write (a race with another payment
 * attempt). Never a DomainError -- recordPayment.js always catches this and
 * translates it to the real domain error (ReservationAlreadyPaid) before it
 * could reach HTTP, so errorMapping.js never needs to know this class exists.
 */
export class PaymentConflict extends Error {
  constructor() {
    super('Reservation was no longer payable when the payment was recorded.');
    this.name = 'PaymentConflict';
  }
}
