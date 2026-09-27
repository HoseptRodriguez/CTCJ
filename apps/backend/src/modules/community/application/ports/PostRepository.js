/**
 * Posts carry `media` ({ id, type, url, posterUrl, width, height,
 * durationSeconds, sortOrder }[]) and `hiddenAt`/`hiddenReason`.
 */
export class PostRepository {
  /** Creates the post and its media rows in one transaction.
   * @returns {Promise<object>} the post, with its media */
  async create(_post) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<{id: string, authorId: string, content: string, createdAt: Date}|null>} */
  async findById(_id) {
    throw new Error('Not implemented');
  }

  /** Newest first, each row enriched with commentCount/likeCount. `before`
   * (a Date, optional) pages further back in time -- omit for the first page.
   * Hidden posts are left out, except the `viewerId`'s own.
   * @returns {Promise<{id: string, authorId: string, content: string, createdAt: Date,
   *   commentCount: number, likeCount: number}[]>} */
  async listRecent(_params) {
    throw new Error('Not implemented');
  }

  /** Hard-deletes the post (comments/likes cascade via FK) and any
   * community_reports pointing at it (no FK there -- see the migration's
   * own comment) -- both in one transaction.
   * @returns {Promise<{ mediaUrls: string[] }>} the URLs of its files (and posters), to delete from storage */
  async delete(_id) {
    throw new Error('Not implemented');
  }

  /** How many posts with media the author created since `since`. @returns {Promise<number>} */
  async countMediaPostsSince(_authorId, _since) {
    throw new Error('Not implemented');
  }

  /** @param {{ reason: string, by: string|null, at: Date }} _hide */
  async hide(_id, _hide) {
    throw new Error('Not implemented');
  }

  async unhide(_id) {
    throw new Error('Not implemented');
  }
}
