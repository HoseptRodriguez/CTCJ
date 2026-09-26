/**
 * Append-only record of who read which clinical content, when, and about
 * which player (the audit_logs table). A read that cannot be recorded must
 * not be served, so callers write the log BEFORE returning content.
 */
export class ClinicalAuditLog {
  /**
   * @param {{ actorUserId: string, actorRoles: string[], playerId: string,
   *   noteIds: string[], via: string }} _read
   */
  async recordNoteReads(_read) {
    throw new Error('Not implemented');
  }
}
