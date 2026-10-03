# Notificaciones por correo y comunicados

Cómo funcionan los avisos del club: dentro de la app (campana), por correo y, más adelante, en el celular (push). Base legal: Ley 2300 de 2023 (mensajes promocionales), Ley 1581 de 2012 (datos personales, menores) y Ley 1098 de 2006 (menores).

## 1. Servicio o promocional

Cada aviso se clasifica en el código (`packages/shared/src/constants/notifications.js`, `classifyNotification`).

| Categoría                      | Tipo            | Ejemplos                                                                   | ¿Se puede apagar?                      |
| ------------------------------ | --------------- | -------------------------------------------------------------------------- | -------------------------------------- |
| Resultados y notas             | Servicio        | Nota visible o evaluación del entrenador                                   | Sí, por canal                          |
| Torneos en los que participo   | Servicio        | Cuadros publicados; cambio de hora, cancha o rival; resultado; cancelación | Sí, por canal                          |
| Comunicados del club           | Servicio        | Cierre de canchas por lluvia, mantenimiento                                | Sí, por canal                          |
| Reservas, facturas y membresía | Servicio        | Cambios en lo que la persona ya tiene                                      | No: siempre se envían                  |
| Retos y comunidad              | Servicio        | Retos, comentarios                                                         | Solo dentro de la app                  |
| Nuevos torneos e inscripciones | **Promocional** | Torneo nuevo con inscripción abierta                                       | Apagado hasta que la persona lo active |
| Promociones                    | **Promocional** | Promociones, eventos y novedades                                           | Apagado hasta que la persona lo active |

### Horarios (`packages/shared/src/time/colombianCalendar.js`)

- **Servicio:** cualquier día, de 7:00 a. m. a 9:00 p. m. (hora de Colombia).
- **Promocional:** lunes a viernes de 7:00 a. m. a 7:00 p. m. y sábados de 8:00 a. m. a 3:00 p. m.; nunca domingos ni festivos.
- Fuera de horario, el correo espera a la siguiente franja permitida (`nextAllowedSendTime`). Por ejemplo, una promoción programada para un domingo sale el lunes a las 7:00 a. m., o el martes si el lunes es festivo.
- Los festivos se calculan en el código: fechas fijas, Ley Emiliani (se pasan al lunes) y festivos que dependen de la Pascua (Jueves y Viernes Santo, Ascensión, Corpus Christi y Sagrado Corazón). Tienen pruebas.

## 2. Preferencias (Mi CTCJ › Notificaciones)

- Interruptores por categoría y canal: **dentro de la app** y **correo**. El canal **push** ya existe en el código (`NOTIFICATION_CHANNELS`, columna `PUSH` en `notification_preferences`), pero está oculto (`available: false`) hasta la fase PWA.
- **Servicio:** se guarda en `notification_preferences`. Si no hay fila, el aviso está activado.
- **Promocional:** se guarda como la autorización **MARKETING** en `consents`, que solo agrega filas y es la prueba de la autorización. Cada cambio queda con su fecha, IP y navegador. `details.categories` dice qué temas y canales eligió la persona; una autorización antigua sin categorías cuenta para todos los temas por los canales que nombró.
- **Resumen diario** (`notification_settings.daily_digest`): un solo correo al día, a la hora `EMAIL_DIGEST_HOUR` (por defecto 6:00 p. m.). Las promociones solo entran en el resumen si a esa hora están permitidas; si no, esperan al siguiente.
- **Menores de edad:** los correos van a sus acudientes aprobados, nunca al menor; sin acudiente aprobado no se envía correo. El menor no puede activar las promociones.

## 3. Correos

- Al pie de cada correo aparece **"Cambiar mis notificaciones"**. En los promocionales aparece además **"Dejar de recibir estos correos"**: un enlace firmado (HMAC) que funciona con un clic y sin iniciar sesión (`/notificaciones/baja?t=…`). Con `API_PUBLIC_URL` configurada se agrega el encabezado `List-Unsubscribe` de un clic (RFC 8058).
- La plantilla es accesible: `lang="es"`, encabezados reales, texto de 16 px, alto contraste con los colores del club, texto alternativo en las imágenes y versión en texto plano.
- Remitente: `MAIL_FROM`, por ejemplo `Club de Tenis Ciudad Jardín <notificaciones@DOMINIO>`.
- **Nunca se incluyen datos de salud.** Los avisos del entrenador solo dicen que hay algo nuevo y enlazan a Mi CTCJ; no copian la nota.
- **Desarrollo:** todo va a Mailhog (SMTP). **Pruebas:** a memoria. Resend solo se usa con `NODE_ENV=production`, aunque haya una clave configurada.

## 4. Envío confiable

1. **Outbox** (`outbox_events`): el módulo que hace el cambio escribe el evento **en la misma transacción** (`apps/backend/src/shared/outbox.js`). Ejemplos: nota del entrenador, cuadros publicados, partido reprogramado, comunicado publicado.
2. Un trabajo que corre cada minuto (`notificationJobs.js`):
   - publica los comunicados cuya hora llegó;
   - procesa los eventos (máximo **3 intentos**, con el error guardado en `last_error`);
   - envía los correos en cola.
3. **Cola de correos** (`email_deliveries`): una fila por correo, con estado, reintentos (máximo 3) y error.
4. **Límites de Resend** ([documentación](https://resend.com/docs/knowledge-base/account-quotas-and-limits), revisada el 2026-10-03):

   | Variable                    | Por defecto | Qué es                                             |
   | --------------------------- | ----------- | -------------------------------------------------- |
   | `EMAIL_DAILY_QUOTA`         | 100         | Plan gratis: 100 correos al día                    |
   | `EMAIL_MONTHLY_QUOTA`       | 3000        | Plan gratis: 3.000 correos al mes                  |
   | `EMAIL_BATCH_SIZE`          | 100         | Correos por llamada a la API de lotes (máximo 100) |
   | `EMAIL_REQUESTS_PER_SECOND` | 10          | Solicitudes por segundo                            |

   Al llegar al límite, los correos pendientes quedan para el día (o el mes) siguiente y /staff/comunicados muestra cuántos esperan. Los avisos de servicio salen antes que las promociones.

5. **Aperturas:** si se configura `RESEND_WEBHOOK_SECRET`, el webhook firmado de Resend (`POST /api/notifications/email-events`, evento `email.opened`) marca el correo como abierto. Sin esa variable no se registran aperturas.

## 5. Comunicados (/staff/comunicados, Administración)

- Se redactan con título, texto con formato básico (`**negrita**`, listas con `- `, enlaces `[texto](https://…)`) e imagen opcional. La imagen exige texto alternativo, se convierte a WebP y se le quitan los metadatos.
- Se elige si es de **Servicio** o **Promocional**, y los destinatarios: todos, solo jugadores, una categoría, los inscritos en un torneo o los acudientes.
- La vista previa muestra el correo, cómo se verá en la app y cuántas personas lo recibirán (y cuántas no, por sus preferencias).
- Se puede **enviar ahora** o **programar**. Si es promocional y la hora no está permitida, el servidor lo rechaza y la consola propone la siguiente franja.
- Siempre hay confirmación antes de enviar. El historial muestra los correos enviados, en cola, fallidos y abiertos.
- El comunicado aparece también en la campana y en Mi CTCJ › Novedades.

## 6. Avisos automáticos

| Cuando…                                                   | Evento                            | Quién lo recibe                                |
| --------------------------------------------------------- | --------------------------------- | ---------------------------------------------- |
| El entrenador guarda una nota **visible para el jugador** | `COACH_NOTE_PUBLISHED`            | El jugador (o su acudiente, por correo)        |
| El entrenador registra una evaluación                     | `PERFORMANCE_RECORDED`            | El jugador                                     |
| Administración publica un torneo                          | `TOURNAMENT_OPENED` (promocional) | Quienes autorizaron "Nuevos torneos"           |
| Se genera el sorteo                                       | `TOURNAMENT_DRAW_PUBLISHED`       | Inscritos, con enlace a `/torneos/:id#cuadros` |
| Cambia la hora o la cancha, o se conoce el rival          | `TOURNAMENT_MATCH_CHANGED`        | Los jugadores del partido                      |
| Se registra un resultado                                  | `TOURNAMENT_MATCH_RESULT`         | Los jugadores del partido                      |
| Se cancela el torneo                                      | `TOURNAMENT_CANCELLED`            | Inscritos                                      |

## 7. Página pública de torneos (/torneos)

- Sin iniciar sesión: torneos con inscripciones abiertas (publicados), en curso y finalizados. Nunca los borradores ni los cancelados.
- Cada torneo muestra fechas, categoría, cuadros y resultados. Los cuadros están en su propio contenedor desplazable, que se puede enfocar con el teclado, y cada partido se anuncia en una frase para el lector de pantalla.
- De los jugadores solo se muestran el nombre y la categoría, nunca datos de contacto. Un menor aparece como **"Lucía R."**, salvo que su acudiente haya dado la autorización `MINOR_PUBLIC_NAME` desde su perfil.

## 8. Agregar push (fase PWA)

1. Mostrar el canal: `available: true` en `NOTIFICATION_CHANNELS`. La pantalla de preferencias lo muestra sola.
2. Dar a `planDelivery` un resultado `push` (hoy la columna `PUSH` ya se guarda).
3. Agregar un transporte push (por ejemplo `web-push`) junto al de correo en `notify.js`.

La clasificación, las preferencias, los horarios y el outbox no cambian.
