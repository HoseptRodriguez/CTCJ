/** Injected so use cases and their tests never call `new Date()` directly.
 * Own copy, mirroring billing's/booking's port exactly -- module owns its
 * narrow port. */
export class Clock {
  /** @returns {Date} */
  now() {
    throw new Error('Not implemented');
  }
}

export const systemClock = { now: () => new Date() };
