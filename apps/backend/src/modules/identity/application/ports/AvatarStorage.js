export class AvatarStorage {
  /**
   * Persists an avatar image and returns its publicly reachable URL.
   * @returns {Promise<string>}
   */
  async save(_buffer, _mimeType) {
    throw new Error('Not implemented');
  }
}
