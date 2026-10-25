/**
 * Append-only trace of administrative changes in booking (the audit_logs
 * table): who, with which roles, what, and the before/after.
 */
export class BookingAuditLog {
  /**
   * @param {{ actorUserId: string, actorRoles: string[], action: string,
   *   entityType: string, entityId: string, before?: object|null, after?: object|null }} _entry
   */
  async record(_entry) {
    throw new Error('Not implemented');
  }
}
