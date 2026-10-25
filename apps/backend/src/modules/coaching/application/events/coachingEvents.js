/**
 * Outbox events of the coaching module, written in the same transaction as
 * the note or the evaluation (shared/outbox.js). They carry only the player
 * id: the notice says "your coach published something", never the content.
 */

export const notePublished = (note) => ({
  aggregateType: 'CoachNote',
  aggregateId: note.id,
  eventType: 'COACH_NOTE_PUBLISHED',
  payload: { playerId: note.playerId },
});

export const performanceRecorded = ({ snapshotId, playerId }) => ({
  aggregateType: 'PerformanceSnapshot',
  aggregateId: snapshotId,
  eventType: 'PERFORMANCE_RECORDED',
  payload: { playerId },
});
