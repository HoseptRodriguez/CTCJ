import { ROLE_CODES } from '@ctcj/shared';

/**
 * Where a user lands after authenticating (login, or bouncing off a route
 * they can't access) -- always an internal page, never the public homepage.
 * "The public landing page is only for visitors" (dashboards phase): every
 * authenticated user has somewhere real of their own to go.
 *
 * Priority mirrors StaffLayout's own canSeePagos/canSeeNotas checks: a user
 * with multiple roles lands on the most staff-privileged dashboard they
 * hold, since that's the role they're most likely acting as.
 *
 * @param {string[]} roles
 * @returns {string} route path
 */
export function resolvePostLoginRoute(roles = []) {
  const has = (role) => roles.includes(role);

  if (has(ROLE_CODES.ADMINISTRADOR) || has(ROLE_CODES.RECEPCION)) {
    return '/staff/panel';
  }
  if (has(ROLE_CODES.ENTRENADOR)) {
    return '/staff/panel-entrenador';
  }
  if (
    has(ROLE_CODES.PSICOLOGO) ||
    has(ROLE_CODES.NEUROPSICOLOGO) ||
    has(ROLE_CODES.FISIOTERAPEUTA)
  ) {
    return '/staff/clinico';
  }
  // JUGADOR and plain USUARIO (not yet affiliated) both land here --
  // MyCtcjPage already handles both cases (affiliation request vs. full
  // player dashboard).
  return '/mi-ctcj';
}
