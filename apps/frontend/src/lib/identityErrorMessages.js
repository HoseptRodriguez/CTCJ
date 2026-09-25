/** Maps the backend's identity error codes (see apps/backend's identity errorMapping.js) to Spanish UI copy. */
const IDENTITY_ERROR_MESSAGES = {
  invalid_credentials:
    'El correo o la contraseña no coinciden. Revísalos e intenta de nuevo, o usa “Olvidé mi contraseña”.',
  email_not_verified:
    'Todavía no has confirmado tu correo. Abre el enlace que te enviamos al registrarte.',
  email_already_registered:
    'Ya existe una cuenta con ese correo. Entra con tu contraseña o usa “Olvidé mi contraseña”.',
  invalid_verification_token:
    'Este enlace de confirmación no sirve o ya venció. Regístrate de nuevo con el mismo correo y te enviaremos otro.',
  invalid_password_reset_token:
    'Este enlace para cambiar la contraseña no sirve o ya venció. Pide uno nuevo.',
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
  invalid_avatar_file: 'El archivo debe ser una imagen JPEG, PNG o WEBP de máximo 2MB.',
  validation_error: 'Revisa los datos ingresados.',
};

export function describeIdentityError(err) {
  if (err?.status === 429) {
    return 'Hiciste demasiados intentos seguidos. Espera unos minutos e intenta de nuevo.';
  }
  if (err?.status === undefined && err?.message === 'Failed to fetch') {
    return 'No hay conexión con el club. Revisa tu internet e intenta de nuevo.';
  }
  return IDENTITY_ERROR_MESSAGES[err?.code] ?? err?.message ?? 'Ocurrió un error inesperado.';
}
