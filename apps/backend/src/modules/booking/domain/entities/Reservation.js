import { RESERVATION_STATUS, RESERVATION_TYPE, OCCUPYING_STATUSES } from '@ctcj/shared';

import { InvalidReservationState } from '../errors/InvalidReservationState.js';
import { HoldExpired } from '../errors/HoldExpired.js';
import { ReservationNotOwned } from '../errors/ReservationNotOwned.js';
import { ReservationAlreadyPaid } from '../errors/ReservationAlreadyPaid.js';
import { ReservationHasNoPrice } from '../errors/ReservationHasNoPrice.js';
import { HOLD_DURATION_MINUTES } from '../policies/bookingPolicy.js';
import { isWithoutPenalty, PENALTY_FREE_WINDOW_HOURS } from '../policies/cancellationPolicy.js';

const HOLD_DURATION_MS = HOLD_DURATION_MINUTES * 60_000;

/**
 * Booking aggregate root. Framework-agnostic by construction: no Express,
 * Prisma, or driver imports anywhere in this file (enforced mechanically by
 * .dependency-cruiser.js).
 */
export class Reservation {
  constructor({
    id,
    clubId,
    courtId,
    periodStart,
    periodEnd,
    status,
    reservationType,
    holderUserId = null,
    createdBy,
    holdExpiresAt = null,
    priceCop = null,
    paymentId = null,
    notes = null,
  }) {
    this.id = id;
    this.clubId = clubId;
    this.courtId = courtId;
    this.periodStart = periodStart;
    this.periodEnd = periodEnd;
    this.status = status;
    this.reservationType = reservationType;
    this.holderUserId = holderUserId;
    this.createdBy = createdBy;
    this.holdExpiresAt = holdExpiresAt;
    this.priceCop = priceCop;
    this.paymentId = paymentId;
    this.notes = notes;
  }

  /** Creates a new PRIVATE reservation in HOLD, expiring HOLD_DURATION_MINUTES from `now`. */
  static createHold({
    id,
    clubId,
    courtId,
    periodStart,
    periodEnd,
    holderUserId,
    createdBy,
    priceCop,
    now,
  }) {
    return new Reservation({
      id,
      clubId,
      courtId,
      periodStart,
      periodEnd,
      status: RESERVATION_STATUS.HOLD,
      reservationType: RESERVATION_TYPE.PRIVATE,
      holderUserId,
      createdBy,
      holdExpiresAt: new Date(now.getTime() + HOLD_DURATION_MS),
      priceCop: priceCop ?? null,
    });
  }

  isOccupying() {
    return OCCUPYING_STATUSES.includes(this.status);
  }

  isHeldBy(userId) {
    return this.holderUserId != null && this.holderUserId === userId;
  }

  isExpired(now) {
    return (
      this.status === RESERVATION_STATUS.HOLD &&
      this.holdExpiresAt != null &&
      now >= this.holdExpiresAt
    );
  }

  /** No-op for staff. Throws ReservationNotOwned unless the caller is the holder. */
  ensureOwnedBy(userId, isStaff) {
    if (isStaff) return;
    if (!this.isHeldBy(userId)) {
      throw new ReservationNotOwned();
    }
  }

  /**
   * Only legal from HOLD. Independently re-checks expiry as defense-in-depth
   * -- the scheduled expireHoldsJob is the primary release mechanism, not
   * this check (see infrastructure/jobs/expireHoldsJob.js).
   *
   * No payment involved here (Phase 4) -- confirming secures the court the
   * moment a player books it, matching real club behavior (reserve now, pay
   * when you arrive). Whether it's paid is a fully separate fact, asserted
   * by assertPayable() below.
   */
  confirm(now) {
    if (this.status !== RESERVATION_STATUS.HOLD) {
      throw new InvalidReservationState(this.status, 'confirm');
    }
    if (this.isExpired(now)) {
      throw new HoldExpired();
    }
    this.status = RESERVATION_STATUS.CONFIRMED;
  }

  /**
   * In-memory guard for recordPayment (see application/useCases/recordPayment.js).
   * The repository's conditional update is the authoritative race guard;
   * this just fails fast and with a specific error before any DB call.
   */
  assertPayable() {
    if (this.status !== RESERVATION_STATUS.CONFIRMED) {
      throw new InvalidReservationState(this.status, 'recordPayment');
    }
    if (this.priceCop == null) {
      throw new ReservationHasNoPrice();
    }
    if (this.paymentId != null) {
      throw new ReservationAlreadyPaid();
    }
  }

  /**
   * Legal from HOLD or CONFIRMED. Returns the penalty-free fact as data --
   * booking computes no money (see docs/adr and cancellationPolicy.js).
   */
  cancel(now, penaltyFreeWindowHours = PENALTY_FREE_WINDOW_HOURS) {
    if (![RESERVATION_STATUS.HOLD, RESERVATION_STATUS.CONFIRMED].includes(this.status)) {
      throw new InvalidReservationState(this.status, 'cancel');
    }
    const withoutPenalty = isWithoutPenalty(this.periodStart, now, penaltyFreeWindowHours);
    this.status = RESERVATION_STATUS.CANCELLED;
    return { withoutPenalty };
  }

  /** Idempotent: no-op unless currently an expired HOLD. */
  expire(now) {
    if (!this.isExpired(now)) return;
    this.status = RESERVATION_STATUS.EXPIRED;
  }
}
