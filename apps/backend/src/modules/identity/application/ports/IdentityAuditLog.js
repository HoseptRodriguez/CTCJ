/**
 * Staff actions over people's accounts (roles, deactivation, verification
 * emails, exports) written to audit_logs. Append-only.
 */
export class IdentityAuditLog {
  /**
   * @param {{ actorUserId: string, actorRoles: string[], action: string, entityType: string,
   *   entityId?: string|null, before?: object|null, after?: object|null }} _entry
   */
  async record(_entry) {
    throw new Error('Not implemented');
  }
}
