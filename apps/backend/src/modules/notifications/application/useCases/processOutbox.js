export const OUTBOX_MAX_ATTEMPTS = 3;

/**
 * Outbox pattern: each event was written in the same transaction as the
 * change that caused it, so no change is lost and none is announced
 * without having happened. This processor delivers them afterwards; a
 * failing event is retried up to 3 times with its error recorded, then
 * left for review (attempts = 3, processed_at empty).
 *
 * @param {{
 *   outboxRepository: import('../ports/OutboxRepository.js').OutboxRepository,
 *   handlers: Record<string, (event: object) => Promise<void>>,
 *   clock: { now: () => Date },
 *   logger?: { warn: Function, error: Function },
 * }} deps
 */
export function createProcessOutbox({ outboxRepository, handlers, clock, logger }) {
  return async function processOutbox({ limit = 50 } = {}) {
    const events = await outboxRepository.listPending(limit, OUTBOX_MAX_ATTEMPTS);
    const result = { processed: 0, failed: 0, skipped: 0 };
    for (const event of events) {
      const handler = handlers[event.eventType];
      if (!handler) {
        // Events of other features (no notification): just mark them.
        await outboxRepository.markProcessed(event.id, clock.now());
        result.skipped += 1;
        continue;
      }
      try {
        await handler(event);
        await outboxRepository.markProcessed(event.id, clock.now());
        result.processed += 1;
      } catch (error) {
        const attempts = event.attempts + 1;
        await outboxRepository.markFailed(event.id, {
          attempts,
          error: String(error?.message ?? error).slice(0, 1000),
        });
        logger?.warn(
          { eventId: event.id, eventType: event.eventType, attempts },
          'outbox event failed',
        );
        result.failed += 1;
      }
    }
    return result;
  };
}
