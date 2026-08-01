import { DomainError } from './DomainError.js';

/**
 * Thrown whenever a non-self-assignable role is granted without an admin
 * grantor. This is RBAC barrier #2 (domain-level), independent of the
 * route-level guard -- see identity/domain/services/grantRole.js.
 */
export class SelfAssignmentForbidden extends DomainError {
  constructor(roleCode) {
    super('self_assignment_forbidden', `Role "${roleCode}" cannot be self-assigned.`);
    this.roleCode = roleCode;
  }
}
