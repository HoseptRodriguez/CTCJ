/**
 * Outbox events of the tournament module. Each one is written in the same
 * transaction as the change it announces (see shared/outbox.js); the
 * notifications module turns them into in-app notices and emails. They
 * carry everything the notice needs (names, player ids), so notifications
 * never reads this module's tables.
 */

const event = (tournament, eventType, payload) => ({
  aggregateType: 'Tournament',
  aggregateId: tournament.id,
  eventType,
  payload: { tournamentId: tournament.id, name: tournament.name, ...payload },
});

const playersOf = (participants, ids) => [
  ...new Set(participants.filter((p) => ids.includes(p.id)).flatMap((p) => p.playerIds)),
];

/** Promotional: registration is open (only to whoever authorized it). */
export const tournamentOpened = (tournament) =>
  event(tournament, 'TOURNAMENT_OPENED', {
    category: tournament.category,
    startsOn: tournament.startsOn ? new Date(tournament.startsOn).toISOString().slice(0, 10) : null,
  });

export const drawPublished = (tournament, participants) =>
  event(tournament, 'TOURNAMENT_DRAW_PUBLISHED', {
    playerIds: [...new Set(participants.flatMap((p) => p.playerIds))],
  });

export const tournamentCancelled = (tournament, participants) =>
  event(tournament, 'TOURNAMENT_CANCELLED', {
    playerIds: [...new Set(participants.flatMap((p) => p.playerIds))],
  });

export const matchResult = (tournament, participants, match) =>
  event(tournament, 'TOURNAMENT_MATCH_RESULT', {
    matchId: match.id,
    playerIds: playersOf(participants, [match.participantAId, match.participantBId]),
  });

/**
 * @param {string[]} changes  any of 'HORA', 'CANCHA', 'RIVAL'
 */
export const matchChanged = (tournament, participants, match, changes) =>
  event(tournament, 'TOURNAMENT_MATCH_CHANGED', {
    matchId: match.id,
    changes,
    scheduledAt: match.scheduledAt ? new Date(match.scheduledAt).toISOString() : null,
    courtName: match.courtName ?? null,
    playerIds: playersOf(participants, [match.participantAId, match.participantBId]),
  });
