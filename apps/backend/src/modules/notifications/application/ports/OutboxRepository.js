/** outbox_events: events written with the change that caused them. */
export class OutboxRepository {
  /** Unprocessed, with attempts < maxAttempts, oldest first. */
  async listPending(_limit, _maxAttempts) {
    throw new Error('Not implemented');
  }

  /**  */
  async markProcessed(_id, _at) {
    throw new Error('Not implemented');
  }

  /** { attempts, error } */
  async markFailed(_id, _input) {
    throw new Error('Not implemented');
  }
}
