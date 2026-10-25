/** email_deliveries: the send queue and its history. */
export class EmailDeliveryRepository {
  /** Inserts deliveries. @returns {Promise<number>} */
  async enqueueMany(_rows) {
    throw new Error('Not implemented');
  }

  /** Idempotency when an event is retried. @returns {Promise<boolean>} */
  async existsForSource(_sourceType, _sourceId, _toEmail) {
    throw new Error('Not implemented');
  }

  /** QUEUED rows with not_before <= now, service first, oldest first. */
  async listDue(_now, _limit) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<number>} */
  async countDue(_now) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<number>} */
  async countSentSince(_since) {
    throw new Error('Not implemented');
  }

  /** { providerMessageId, sentAt } */
  async markSent(_id, _input) {
    throw new Error('Not implemented');
  }

  /** { error, attempts, failed, retryAt } */
  async markAttemptFailed(_id, _input) {
    throw new Error('Not implemented');
  }

  /** { notBefore, reason } */
  async reschedule(_ids, _input) {
    throw new Error('Not implemented');
  }

  /** From the Resend webhook. */
  async markOpened(_providerMessageId, _openedAt) {
    throw new Error('Not implemented');
  }

  /** status DIGEST rows, oldest first. */
  async listDigestItems() {
    throw new Error('Not implemented');
  }

  /** The items went out inside a digest. */
  async markIncludedInDigest(_ids, _at) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<Map<string, { queued, sent, failed, opened }>>} */
  async statsBySource(_sourceType, _sourceIds) {
    throw new Error('Not implemented');
  }

  /** QUEUED rows waiting for the next day because of the plan limits. */
  async quotaDeferredCount() {
    throw new Error('Not implemented');
  }
}
