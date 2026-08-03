/** Maps the backend's identity error codes (see apps/backend's identity errorMapping.js) to Spanish UI copy. */
const IDENTITY_ERROR_MESSAGES = {
  user_not_found: 'No se encontró ningún usuario con ese correo.',
  membership_not_applicable:
    'Ese usuario no tiene el rol Jugador, no se le puede asignar un estado de membresía.',
  already_jugador: 'Este usuario ya tiene el rol Jugador.',
  affiliation_request_already_pending: 'Ya tienes una solicitud de afiliación pendiente.',
  affiliation_request_not_found: 'No se encontró esa solicitud de afiliación.',
  affiliation_request_not_pending: 'Esa solicitud de afiliación ya fue resuelta.',
  guardianship_already_exists: 'Ya existe una vinculación con esa cuenta.',
  guardianship_self_link_forbidden: 'No puedes vincularte como tutor de tu propia cuenta.',
  guardianship_not_found: 'No se encontró esa vinculación familiar.',
  guardianship_not_pending: 'Esa vinculación familiar ya fue resuelta.',
};

export function describeIdentityError(err) {
  return IDENTITY_ERROR_MESSAGES[err?.code] ?? err?.message ?? 'Ocurrió un error inesperado.';
}
