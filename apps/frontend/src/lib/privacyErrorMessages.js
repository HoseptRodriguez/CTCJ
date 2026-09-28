/** Maps the backend's privacy error codes (apps/backend privacy errorMapping.js) to Spanish UI copy. */
const PRIVACY_ERROR_MESSAGES = {
  data_request_not_found: 'No encontramos esa solicitud.',
  data_request_already_answered: 'Esta solicitud ya fue respondida.',
  erase_only_for_deletion_request:
    'Solo una solicitud de eliminación de cuenta, al responderla, puede eliminar la cuenta.',
  deletion_request_already_open: 'Ya tienes una solicitud de eliminación de cuenta en trámite.',
  validation_error: 'Revisa los datos del formulario.',
};

export function describePrivacyError(err) {
  return PRIVACY_ERROR_MESSAGES[err?.code] ?? err?.message ?? 'Ocurrió un error inesperado.';
}
