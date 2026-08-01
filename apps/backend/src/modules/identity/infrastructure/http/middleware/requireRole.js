import { HttpError } from '../../../../../shared/errors/httpError.js';

/**
 * RBAC barrier #1 (route-level), independent of the domain-level barrier
 * (identity/domain/services/grantRole.js). Must run after requireAuth.
 */
export function requireRole(roleCode) {
  return (req, res, next) => {
    if (!req.user || !req.user.roles?.includes(roleCode)) {
      return next(
        new HttpError(403, 'forbidden', 'You do not have permission to perform this action.'),
      );
    }
    return next();
  };
}
