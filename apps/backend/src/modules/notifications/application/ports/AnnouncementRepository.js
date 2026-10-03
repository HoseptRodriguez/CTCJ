/** announcements (Comunicados). */
export class AnnouncementRepository {
  /** @returns {Promise<object>} */
  async create(_announcement) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<object|null>} */
  async findById(_id) {
    throw new Error('Not implemented');
  }

  /** Newest first. */
  async list(_clubId, _limit) {
    throw new Error('Not implemented');
  }

  /** Only a SCHEDULED one. @returns {Promise<object|null>} */
  async cancel(_id, _at) {
    throw new Error('Not implemented');
  }

  /** Marks every due SCHEDULED one SENT and writes its outbox event in the same transaction. @returns {Promise<object[]>} */
  async publishDue(_now) {
    throw new Error('Not implemented');
  }

  /** { recipientsCount, excludedCount } */
  async setCounts(_id, _counts) {
    throw new Error('Not implemented');
  }

  /** For "Novedades". */
  async listSent(_clubId, _limit) {
    throw new Error('Not implemented');
  }
}
