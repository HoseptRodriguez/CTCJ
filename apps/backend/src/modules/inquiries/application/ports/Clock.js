/** Injected so use cases and their tests never call `new Date()` directly. */
export class Clock {
  /** @returns {Date} */
  now() {
    throw new Error('Not implemented');
  }
}

export const systemClock = { now: () => new Date() };
