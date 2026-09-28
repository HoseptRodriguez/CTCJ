/** Maps the backend's community error codes (see apps/backend's community errorMapping.js) to Spanish UI copy. */
const COMMUNITY_ERROR_MESSAGES = {
  post_not_found: 'No se encontró esa publicación.',
  comment_not_found: 'No se encontró ese comentario.',
  content_not_found: 'No se encontró ese contenido.',
  report_not_found: 'No se encontró ese reporte.',
  report_already_pending: 'Ya reportaste este contenido.',
  player_not_eligible: 'Debes tener el rol Jugador para usar la comunidad.',
  minor_media_not_allowed: 'Las cuentas de menores de edad solo pueden publicar texto.',
  minor_pending_guardian_authorization:
    'Tu cuenta está pendiente de la autorización de tu acudiente. Cuando la dé, podrás publicar.',
  daily_media_limit:
    'Ya publicaste 10 veces con fotos o videos hoy. Mañana podrás volver a hacerlo; mientras tanto, puedes publicar texto.',
  video_upload_unavailable: 'No pudimos preparar la subida del video. Intenta de nuevo.',
  media_too_many_images: 'Puedes publicar hasta 4 fotos a la vez.',
  media_images_and_video: 'Publica fotos o un video, no los dos a la vez.',
  media_empty_post: 'Escribe algo o agrega una foto o un video antes de publicar.',
  media_image_too_large: 'Una de las fotos pesa más de 10 MB. Elige una más liviana.',
  media_video_too_large: 'El video pesa más de 50 MB. Recórtalo o elige uno más corto.',
  media_video_too_long: 'El video dura más de 60 segundos. Recórtalo o elige uno más corto.',
  media_unsupported_type:
    'Ese archivo no es una foto (JPG, PNG, WebP o HEIC) ni un video (MP4 o WebM) válido.',
  media_unreadable_image: 'No pudimos leer una de las fotos. Si es HEIC, compártela como JPG.',
  media_video_not_owned: 'No encontramos el video que subiste. Intenta subirlo otra vez.',
  network_error: 'Se cortó la conexión. Revisa tu internet e intenta de nuevo.',
};

export function describeCommunityError(err) {
  return COMMUNITY_ERROR_MESSAGES[err?.code] ?? err?.message ?? 'Ocurrió un error inesperado.';
}
