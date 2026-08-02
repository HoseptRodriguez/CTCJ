import { HttpError } from '../../../../../shared/errors/httpError.js';

/**
 * RBAC barrier #1 (route-level), independent of the domain-level barrier
 * (identity/domain/services/grantRole.js). Must run after requireAuth.
 *
 * Accepts a single role code or an array (OR semantics -- any one of the
 * listed roles is enough). A bare string is wrapped into a one-element
 * array, so every existing `requireRole(ROLE_CODES.X)` call site keeps
 * working unchanged.
 */
export function requireRole(roleCodes) {
  const allowed = Array.isArray(roleCodes) ? roleCodes : [roleCodes];
  return (req, res, next) => {
    const userRoles = req.user?.roles ?? [];
    if (!userRoles.some((role) => allowed.includes(role))) {
      return next(
        new HttpError(403, 'forbidden', 'You do not have permission to perform this action.'),
      );
    }
    return next();
  };
}
