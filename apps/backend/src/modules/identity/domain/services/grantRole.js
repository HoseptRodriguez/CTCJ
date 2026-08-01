/**
 * RBAC barrier #2 (domain-level), independent of the route-level guard in
 * infrastructure/http/middleware/requireRole.js. This rule must hold even if
 * a future code path invokes it directly, bypassing the HTTP layer entirely.
 *
 * The invariant itself lives on the User aggregate (see domain/entities/User.js);
 * this function is the single call site the application layer uses so the
 * rule's entry point stays explicit and easy to find/test in isolation.
 */
export function grantRole(user, roleCode, grantorIsAdmin) {
  user.grantRole(roleCode, grantorIsAdmin);
  return user;
}
