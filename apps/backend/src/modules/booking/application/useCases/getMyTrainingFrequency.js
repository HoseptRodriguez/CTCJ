import { RESERVATION_STATUS, RESERVATION_TYPE } from '@ctcj/shared';

/**
 * Self-service: how many CLASS sessions the caller has actually had
 * (CONFIRMED status, not just held) in the last `days` days. Backs both the
 * TRAINING_FREQUENCY goal metric and the "Semana completa" achievement
 * badge (Phase 2) -- nothing before this counted a player's *past*
 * reservations, only forward-looking schedule queries existed.
 *
 * @param {{ reservationRepository: import('../ports/ReservationRepository.js').ReservationRepository, clock: import('../ports/Clock.js').Clock }} deps
 */
export function createGetMyTrainingFrequency({ reservationRepository, clock }) {
  /** @param {{ playerId: string, days?: number }} input */
  return async function getMyTrainingFrequency({ playerId, days = 7 }) {
    const to = clock.now();
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

    const reservations = await reservationRepository.listByHolderAndDateRange(playerId, from, to);
    const count = reservations.filter(
      (r) =>
        r.status === RESERVATION_STATUS.CONFIRMED && r.reservationType === RESERVATION_TYPE.CLASS,
    ).length;

    return { count };
  };
}
