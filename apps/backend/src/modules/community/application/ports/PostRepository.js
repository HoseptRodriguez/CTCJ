export class PostRepository {
  /** @returns {Promise<{id: string, authorId: string, content: string, createdAt: Date}>} */
  async create(_post) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<{id: string, authorId: string, content: string, createdAt: Date}|null>} */
  async findById(_id) {
    throw new Error('Not implemented');
  }

  /** Newest first, each row enriched with commentCount/likeCount. `before`
   * (a Date, optional) pages further back in time -- omit for the first page.
   * @returns {Promise<{id: string, authorId: string, content: string, createdAt: Date,
   *   commentCount: number, likeCount: number}[]>} */
  async listRecent(_params) {
    throw new Error('Not implemented');
  }

  /** Hard-deletes the post (comments/likes cascade via FK) and any
   * community_reports pointing at it (no FK there -- see the migration's
   * own comment) -- both in one transaction. @returns {Promise<void>} */
  async delete(_id) {
    throw new Error('Not implemented');
  }
}
