export class CommentRepository {
  /** @returns {Promise<{id: string, postId: string, authorId: string, content: string, createdAt: Date}>} */
  async create(_comment) {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<{id: string, postId: string, authorId: string, content: string, createdAt: Date}|null>} */
  async findById(_id) {
    throw new Error('Not implemented');
  }

  /** Oldest first (reading order). @returns {Promise<Array>} */
  async listByPost(_postId) {
    throw new Error('Not implemented');
  }

  /** Hard-deletes the comment and any community_reports pointing at it (no
   * FK there -- see the migration's own comment), both in one transaction.
   * @returns {Promise<void>} */
  async delete(_id) {
    throw new Error('Not implemented');
  }
}
