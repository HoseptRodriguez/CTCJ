import { grantRole } from '../../domain/services/grantRole.js';
import { UserNotFound } from '../errors/UserNotFound.js';

/**
 * RBAC barrier #2's entry point from the application layer. The route-level
 * guard (barrier #1) is enforced separately in
 * infrastructure/http/middleware/requireRole.js -- this use case enforces
 * the rule again, independently, so it holds regardless of caller.
 *
 * @param {{
 *   userRepository: import('../ports/UserRepository.js').UserRepository,
 *   roleRepository: import('../ports/RoleRepository.js').RoleRepository,
 * }} deps
 */
export function createGrantRoleToUser({ userRepository, roleRepository }) {
  return async function grantRoleToUser({
    targetUserId,
    roleCode,
    grantedByUserId,
    grantorIsAdmin,
  }) {
    const user = await userRepository.findById(targetUserId);
    if (!user) {
      throw new UserNotFound();
    }

    const role = await roleRepository.findByCode(roleCode);
    if (!role) {
      // Zod validation at the HTTP boundary already restricts roleCode to
      // ROLE_CODES, so reaching here means the DB seed is out of sync with
      // the code constants -- a genuine invariant violation, not user input.
      throw new Error(`Role "${roleCode}" is not seeded in the database.`);
    }

    grantRole(user, roleCode, grantorIsAdmin);

    await userRepository.addRoleGrant(user.id, roleCode, grantedByUserId);

    return { userId: user.id, roleCode };
  };
}
