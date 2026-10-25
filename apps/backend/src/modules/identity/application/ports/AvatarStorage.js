export class AvatarStorage {
  /**
   * Persists an avatar image and returns its publicly reachable URL.
   * @returns {Promise<string>}
   */
  async save(_buffer, _mimeType) {
    throw new Error('Not implemented');
  }

  /** Deletes an avatar saved by this storage (used when an account is deleted). */
  async remove(_url) {
    throw new Error('Not implemented');
  }
}
