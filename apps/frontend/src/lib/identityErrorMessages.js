/** Maps the backend's identity error codes (see apps/backend's identity errorMapping.js) to Spanish UI copy. */
const IDENTITY_ERROR_MESSAGES = {
  user_not_found: 'No se encontró ningún usuario con ese correo.',
  membership_not_applicable:
    'Ese usuario no tiene el rol Jugador, no se le puede asignar un estado de membresía.',
};

export function describeIdentityError(err) {
  return IDENTITY_ERROR_MESSAGES[err?.code] ?? err?.message ?? 'Ocurrió un error inesperado.';
}
