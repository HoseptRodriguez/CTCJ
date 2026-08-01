import { mapIdentityError } from './errorMapping.js';

function asyncHandler(fn) {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => next(mapIdentityError(err)));
  };
}

/**
 * Barrier #1 (route guard: requireAuth + requireRole('ADMINISTRADOR')) has
 * already run by the time this controller executes -- see adminRoutes.js.
 * grantorIsAdmin is therefore always true here; barrier #2 (domain-level,
 * see domain/services/grantRole.js) still runs independently inside the use
 * case as defense-in-depth for any future caller that bypasses this route.
 *
 * @param {ReturnType<import('../compositionRoot.js').buildIdentityContainer>} container
 */
export function createRoleAdminController(container) {
  const grant = asyncHandler(async (req, res) => {
    const { userId, roleCode } = req.body;
    await container.grantRoleToUser({
      targetUserId: userId,
      roleCode,
      grantedByUserId: req.user.id,
      grantorIsAdmin: true,
    });
    res.status(204).end();
  });

  return { grant };
}
