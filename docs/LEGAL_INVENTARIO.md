# Inventario legal — datos, almacenamiento, terceros y recursos

Hecho a partir del código de la rama `rediseno` el 2026-09-28 y actualizado con la Parte 2 (minimización) el mismo día. Describe lo que el sistema **hace hoy**, no lo que debería hacer.

Convenciones:

- **[COMPLETAR]**: dato que debe dar el club.
- **[VERIFICAR]**: dato que hay que confirmar (proveedor, país, plazo).
- ⚠️ **NO SE USA**: se guarda o existe en la base, pero ninguna pantalla ni proceso lo usa.

Responsable del tratamiento: **el club** (Club de Tenis Ciudad Jardín) [COMPLETAR: razón social y NIT]. Los desarrolladores no son responsables del tratamiento.

---

## a) Datos personales

### a.1 Cuenta y perfil (`users`)

| Campo                                                                                                                                       | Dónde se pide                                                                                       | Obligatorio                 | Para qué se usa                                                                                                                                                                                                                 | Dónde se guarda                                                            | Cuánto tiempo                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Nombre y apellido                                                                                                                           | Registro                                                                                            | Sí                          | Identificar a la persona en reservas, cobros, comunidad y fichas                                                                                                                                                                | `users.first_name/last_name`                                               | Mientras exista la cuenta [COMPLETAR]                                                         |
| Correo                                                                                                                                      | Registro                                                                                            | Sí                          | Inicio de sesión, verificación, recuperación de contraseña, avisos del servicio                                                                                                                                                 | `users.email`                                                              | Mientras exista la cuenta [COMPLETAR]                                                         |
| Contraseña                                                                                                                                  | Registro                                                                                            | Sí                          | Inicio de sesión (solo se guarda el hash argon2, nunca la contraseña)                                                                                                                                                           | `users.password_hash`                                                      | Mientras exista la cuenta                                                                     |
| Teléfono                                                                                                                                    | Mi perfil                                                                                           | No                          | Contacto del club con el jugador (visible para el personal)                                                                                                                                                                     | `users.phone`                                                              | [COMPLETAR]                                                                                   |
| Fecha de nacimiento                                                                                                                         | Mi perfil                                                                                           | No                          | Saber si es **menor de edad** (restricciones de Comunidad y tutelas)                                                                                                                                                            | `users.birth_date`                                                         | [COMPLETAR]                                                                                   |
| Presentación (bio)                                                                                                                          | Mi perfil                                                                                           | No                          | Se muestra en el perfil del jugador                                                                                                                                                                                             | `users.bio`                                                                | [COMPLETAR]                                                                                   |
| Foto de perfil                                                                                                                              | Mi perfil                                                                                           | No                          | Avatar en la consola, Mi CTCJ y la Comunidad (se reprocesa a WebP y se le quitan los EXIF)                                                                                                                                      | Vercel Blob / disco en desarrollo, URL en `users.avatar_url`               | [COMPLETAR]                                                                                   |
| Mano dominante y revés                                                                                                                      | Mi perfil                                                                                           | No                          | Estilo de juego; lo ven el jugador y sus entrenadores (tarjeta del jugador)                                                                                                                                                     | `users.dominant_hand/backhand`                                             | Mientras exista la cuenta [COMPLETAR]                                                         |
| Tipo y número de documento                                                                                                                  | Ficha del jugador en la consola (**solo recepción y Administración**), nunca en el registro público | No                          | Factura electrónica a nombre del jugador o inscripción en torneos de liga, solo cuando haga falta                                                                                                                               | `users.document_type/document_number`                                      | [COMPLETAR]                                                                                   |
| Verificación en dos pasos (`mfa_enabled`, `mfa_secret` cifrado, `mfa_enabled_at`, intentos y bloqueo) y códigos de recuperación (solo hash) | Mi perfil; obligatoria al entrar para Administración, Psicología, Neuropsicología y Fisioterapia    | Obligatoria para esos roles | Proteger el acceso a la consola y a los datos de salud. La clave de la aplicación se guarda cifrada (AES-256-GCM, `MFA_ENCRYPTION_KEY`) y los códigos de recuperación solo como HMAC-SHA256                                     | `users`, `mfa_recovery_codes`                                              | Mientras la cuenta exista; se borra al desactivarla, al restablecerla o al eliminar la cuenta |
| Aceptaciones y autorizaciones                                                                                                               | Registro (Parte 5), autorización del acudiente, cookies                                             | Según el tipo               | **Prueba de cada autorización** (tipo, versión del documento, aceptada o retirada, fecha, IP, navegador). Sustituye a `accepted_terms_at`/`accepted_privacy_at`, cuyas fechas se copiaron antes como versión 1 (estaban vacías) | `consents` (solo se agregan filas; nunca se modifican ni se borran)        | Indefinido, como prueba [VERIFICAR plazo]                                                     |
| `is_demo`                                                                                                                                   | —                                                                                                   | —                           | Marcar datos de demostración para que **nunca se muestren en producción** (Parte 6)                                                                                                                                             | `users`                                                                    | —                                                                                             |
| Solicitudes sobre datos personales (consultas y reclamos)                                                                                   | Mi CTCJ › Mis datos y privacidad                                                                    | Ley 1581, arts. 14 y 15     | Radicado, tipo, lo que pide la persona, fechas de recibo y vencimiento, respuesta y quién respondió                                                                                                                             | `data_subject_requests` (no se borran; sobreviven a la cuenta anonimizada) | [COMPLETAR]                                                                                   |
| `deleted_at`                                                                                                                                | —                                                                                                   | —                           | Se conserva para la **eliminación de cuenta con anonimización** (Parte 5)                                                                                                                                                       | `users`                                                                    | —                                                                                             |
| Último inicio de sesión, intentos fallidos, bloqueo                                                                                         | Automático                                                                                          | —                           | Seguridad (bloqueo tras 5 intentos)                                                                                                                                                                                             | `users`                                                                    | Mientras exista la cuenta                                                                     |
| Estado de la cuenta y de la membresía                                                                                                       | Automático / Administración                                                                         | —                           | Acceso y bloqueo opcional de reservas por mora                                                                                                                                                                                  | `users`                                                                    | Mientras exista la cuenta                                                                     |

### a.2 Seguridad y sesiones

| Dato                                                                                    | Para qué                                                                            | Dónde                                     | Cuánto tiempo                                                                                                                                                |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| IP y navegador (user agent) de cada sesión                                              | Seguridad de la sesión (detectar reutilización de tokens)                           | `refresh_tokens.ip_address/user_agent`    | La sesión caduca a los 30 días, pero **la fila no se borra nunca** [COMPLETAR]                                                                               |
| IP de quien pide recuperar la contraseña                                                | Seguridad                                                                           | `password_resets.requested_ip`            | Sin purga [COMPLETAR]                                                                                                                                        |
| Tokens de verificación y recuperación (hash)                                            | Verificar el correo y cambiar la contraseña                                         | `email_verifications`, `password_resets`  | Sin purga [COMPLETAR]                                                                                                                                        |
| Registro de auditoría (quién, rol, acción, antes y después; puede tener IP y navegador) | Trazabilidad de lecturas de notas clínicas, cambios de precios y limpiezas de datos | `audit_logs` (tabla particionada por mes) | Sin plazo (no se borra) [COMPLETAR]                                                                                                                          |
| Registros del servidor (pino-http)                                                      | Diagnóstico                                                                         | Salida estándar del proveedor de hosting  | Lo que conserve el proveedor [VERIFICAR]. **Corregido el 2026-09-28:** solo método, ruta sin parámetros, estado y tiempo; sin cabeceras, sin IP y sin tokens |

### a.3 Club, reservas y pagos

| Dato                                                                                                                         | Dónde se genera         | Para qué                                                                                                                                                                                                                                        | Dónde                                                                | Cuánto tiempo                                                |
| ---------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------ |
| Reservas (cancha, hora, titular, quién la hizo, precio, notas)                                                               | Reservar cancha         | Prestar el servicio y cobrar en recepción                                                                                                                                                                                                       | `reservations`                                                       | [COMPLETAR]                                                  |
| Pagos (valor, método, quién cobró, notas)                                                                                    | Cobros (recepción)      | Contabilidad                                                                                                                                                                                                                                    | `payments`                                                           | Lo que exija la ley contable [COMPLETAR: plazo del contador] |
| Membresías, ajustes (becas, descuentos, con motivo), facturas                                                                | Administración          | Cobro de mensualidades                                                                                                                                                                                                                          | `memberships`, `membership_adjustments`, `invoices`, `invoice_lines` | Ídem [COMPLETAR]                                             |
| Solicitud de afiliación (nota libre)                                                                                         | Mi CTCJ                 | Pasar de Usuario a Jugador                                                                                                                                                                                                                      | `affiliation_requests`                                               | [COMPLETAR]                                                  |
| Tutelas (acudiente ↔ menor, permisos de reservar y pagar) y **autorización del acudiente para los datos e imagen del menor** | Mi perfil del acudiente | Reservar y pagar por el menor. El menor se registra con su propio correo, pero su cuenta queda **pendiente de autorización del acudiente** (no puede reservar, publicar ni recibir promociones) hasta que el acudiente la vincule y la autorice | `guardianships`, `consents` (MINOR_DATA_IMAGE)                       | [COMPLETAR]                                                  |
| Notificaciones (título, texto)                                                                                               | Automático              | Avisos del servicio dentro del sitio                                                                                                                                                                                                            | `notifications`                                                      | Sin purga [COMPLETAR]                                        |

### a.4 Deporte y rendimiento

| Dato                                            | Quién lo registra    | Para qué                        | Dónde                                                                    | Cuánto tiempo |
| ----------------------------------------------- | -------------------- | ------------------------------- | ------------------------------------------------------------------------ | ------------- |
| Notas del entrenador (texto libre, visibilidad) | Entrenador           | Seguimiento deportivo           | `coach_notes`                                                            | [COMPLETAR]   |
| Evaluaciones de rendimiento (1–10 por área)     | Entrenador           | Seguimiento deportivo, gráficas | `performance_ratings`                                                    | [COMPLETAR]   |
| Metas del jugador                               | Jugador              | Motivación y seguimiento        | `goals`                                                                  | [COMPLETAR]   |
| Retos, resultados, ranking, torneos             | Jugadores / personal | Competencia interna             | `challenges`, `challenge_match_results`, `competition_*`, `tournament_*` | [COMPLETAR]   |

### a.5 Datos de salud (datos **sensibles**, Ley 1581 art. 5)

| Dato                                                                           | Quién lo registra      | Para qué                      | Dónde                                                                | Cuánto tiempo                        |
| ------------------------------------------------------------------------------ | ---------------------- | ----------------------------- | -------------------------------------------------------------------- | ------------------------------------ |
| Citas de psicología, neuropsicología y fisioterapia                            | Profesional / personal | Agenda clínica                | `clinical_appointments`                                              | [VERIFICAR: Resolución 1995 de 1999] |
| Notas clínicas (texto libre, visibilidad)                                      | Profesional            | Atención                      | `clinical_notes`                                                     | [VERIFICAR]                          |
| Planes de recuperación, antecedentes médicos, aptitud física                   | Profesional            | Atención y aptitud para jugar | `recovery_plans`, `medical_history_entries`, `physio_fitness_status` | [VERIFICAR]                          |
| Autorización del jugador para que Administración lea sus notas de fisioterapia | Jugador                | Acceso limitado y auditado    | `clinical_access_consents`                                           | Nunca se borra (se revoca)           |

**Resuelto (Parte 5):** se pide una autorización explícita y opcional de datos de salud (`consents`, HEALTH_DATA) antes de agendar o registrar cualquier dato de salud; para un menor la da el acudiente.

### a.6 Comunidad

| Dato                                                          | Para qué                 | Dónde                                                  | Cuánto tiempo                              |
| ------------------------------------------------------------- | ------------------------ | ------------------------------------------------------ | ------------------------------------------ |
| Publicaciones y comentarios (texto)                           | Muro de jugadores        | `community_posts`, `community_comments`                | Hasta que el autor o el personal los borre |
| Fotos (WebP ≤1600 px, **sin EXIF/GPS**) y videos (hasta 60 s) | Muro de jugadores        | Vercel Blob (disco en desarrollo); URL en `post_media` | Se borran con la publicación               |
| "Me gusta" y reportes (con motivo)                            | Interacción y moderación | `community_post_likes`, `community_reports`            | [COMPLETAR]                                |

Imágenes de menores: las cuentas de menores no pueden subir fotos ni videos; cualquier publicación se puede reportar ("Aparece un menor sin autorización") y se oculta sola con 3 reportes.

---

## b) Cookies y almacenamiento del navegador

| Nombre                      | Tipo                                                                             | Finalidad                                                                                                              | Duración                                         | Propia / terceros | ¿Necesaria?                         |
| --------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ----------------- | ----------------------------------- |
| `ctcj_refresh`              | Cookie (`httpOnly`, `sameSite=strict`, `secure` en producción, `path=/api/auth`) | Mantener la sesión iniciada (token de renovación)                                                                      | 30 días (se renueva al usarse)                   | Propia            | **Sí** (estrictamente necesaria)    |
| `ctcj:cookie-consent`       | `localStorage`                                                                   | Recordar la decisión sobre cookies, con fecha y versión de la política (si la política cambia, se vuelve a preguntar)  | Hasta que se borre o cambie la política          | Propia            | **Sí** (necesaria)                  |
| `ctcj:font-scale`           | `localStorage`                                                                   | Recordar "Letra grande". **Solo se guarda y se lee si se aceptan las Preferencias** (desde la Parte 4)                 | Hasta que se borre o se retire el consentimiento | Propia            | **No** (preferencia)                |
| Token de acceso             | Memoria de la página (no se guarda)                                              | Autenticar las llamadas al API                                                                                         | 15 minutos, se pierde al recargar                | Propia            | Sí (no es cookie ni almacenamiento) |
| `sessionStorage`, IndexedDB | —                                                                                | **No se usan**                                                                                                         | —                                                | —                 | —                                   |
| Cookies de terceros         | —                                                                                | **Ninguna.** Pero hoy las fuentes se cargan de Google (ver c): Google recibe la IP, el navegador y la página de origen | —                                                | Terceros          | —                                   |

---

## c) Terceros e integraciones

| Tercero                                                                     | Qué hace                                                                                                        | Qué datos recibe                                           | País del servidor                | ¿Cookies?                  |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------- | -------------------------- |
| **Render** [VERIFICAR: plan de despliegue]                                  | Hosting del backend (API) y, según el plan, del frontend                                                        | Todo lo que pasa por el API, y los registros del servidor  | [VERIFICAR: región del servicio] | No                         |
| **Vercel** [VERIFICAR: ¿se usa para el frontend?]                           | Hosting del frontend (alternativa)                                                                              | IP y navegador de cada visita (registros)                  | [VERIFICAR]                      | [VERIFICAR]                |
| **Vercel Blob**                                                             | Almacén de fotos de perfil y de la Comunidad (con token)                                                        | Las imágenes y videos subidos; la IP de quien los ve (CDN) | [VERIFICAR: región del almacén]  | No                         |
| **Base de datos PostgreSQL** (Neon, Supabase u otro) [VERIFICAR: proveedor] | Guarda toda la información                                                                                      | Todos los datos del inventario                             | [VERIFICAR]                      | No                         |
| **Resend**                                                                  | Envío de correos (verificación, recuperación de contraseña)                                                     | Correo, nombre y contenido del mensaje                     | Estados Unidos [VERIFICAR]       | No                         |
| ~~Google Fonts~~                                                            | **Eliminado el 2026-09-28:** Archivo y Archivo Narrow (SIL OFL) se sirven desde el propio sitio (`@fontsource`) | Nada                                                       | —                                | No                         |
| Google Maps                                                                 | Solo un **enlace** "Cómo llegar"                                                                                | Nada hasta que la persona toca el enlace                   | —                                | Solo en el sitio de Google |
| WhatsApp (`wa.me`)                                                          | Solo un **enlace**                                                                                              | Nada hasta que se toca                                     | —                                | Solo en WhatsApp           |
| Instagram, Facebook, TikTok                                                 | Solo **enlaces**                                                                                                | Nada hasta que se tocan                                    | —                                | Solo en esas redes         |
| Mailhog                                                                     | Correos de **desarrollo** (local)                                                                               | Nada en producción                                         | Local                            | No                         |

- **Sin CDN de scripts:** todo el JavaScript se empaqueta y se sirve desde el propio sitio.
- **Librerías que llaman a terceros:** solo `@vercel/blob/client`, que sube videos directo a Vercel Blob cuando hay token.
- **Sin mapas, videos ni botones de redes incrustados.**

---

## d) Analítica, píxeles y seguimiento

**No hay ninguno.** Busqué en el frontend, el backend y `index.html` Google Analytics, Tag Manager, píxel de Facebook, Hotjar, Clarity, PostHog, Mixpanel, Segment, Plausible y Sentry, sin resultados. Tampoco hay SDK de terceros en el navegador (salvo Google Fonts, sección c).

---

## e) Fotos, tipografías, íconos y librerías

### e.1 Fotos (`apps/frontend/public/img/club/`)

Todas vienen del **folleto oficial del club** (entregadas por el club). Autor: [COMPLETAR]. Se les quitaron los metadatos EXIF/GPS.

| Foto                                  | Personas identificables                                                                                         | Autorización de imagen                          |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `canchas-panoramica-nubes`            | No (personas lejanas, no reconocibles)                                                                          | No aplica                                       |
| `jugador-desplazamiento`              | Sí, un adulto                                                                                                   | [COMPLETAR]                                     |
| `jugador-espera-recepcion`            | Sí, un adulto                                                                                                   | [COMPLETAR]                                     |
| `jugador-saque-azul`                  | Sí, un jugador **tratado como posible menor** hasta que el club confirme su edad (misma regla que `nino-saque`) | [COMPLETAR] [VERIFICAR edad]                    |
| `nino-saque`                          | **Sí, un menor de edad**                                                                                        | [COMPLETAR: autorización escrita del acudiente] |
| `academia-chaqueta-orlando-rodriguez` | De espaldas, identificable por el nombre en la chaqueta (Orlando Rodríguez)                                     | **Pendiente de su autorización** [COMPLETAR]    |

Logotipos (escudo, bola de fuego y favicons): propiedad del club.

### e.2 Tipografías e íconos

| Recurso                            | Origen                                                                                            | Licencia                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Archivo, Archivo Narrow            | Paquetes `@fontsource/archivo` y `@fontsource/archivo-narrow` 5.x, servidos desde el propio sitio | SIL Open Font License 1.1                                                    |
| 44 íconos SVG (`components/icons`) | **Derivados de Lucide** (Parte 6)                                                                 | Licencia ISC: aviso publicado en /licencias-terceros.txt (docs/LICENCIAS.md) |

### e.3 Librerías que se envían al navegador (frontend)

| Librería          | Versión        | Licencia                                                                                                                |
| ----------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| react, react-dom  | 18.3.1         | MIT                                                                                                                     |
| react-router-dom  | 6.30.6         | MIT                                                                                                                     |
| framer-motion     | 11.18.2        | MIT                                                                                                                     |
| gsap, @gsap/react | 3.15.0 / 2.1.2 | GSAP Standard "no charge" License (no es código abierto; uso gratuito con condiciones) [VERIFICAR condiciones vigentes] |
| recharts          | 3.10.1         | MIT                                                                                                                     |
| zod               | 3.25.76        | MIT                                                                                                                     |
| @vercel/blob      | 2.8.0          | Apache-2.0                                                                                                              |

### e.4 Librerías del servidor (backend)

- **MIT:** express 4.22.3, helmet 7.2.0, cors, cookie-parser, express-rate-limit, pino, pino-http, argon2, jsonwebtoken, multer, resend.
- **MIT-0:** nodemailer.
- **BSD-2-Clause:** dotenv.
- **Apache-2.0:** @prisma/client 5.22.0, sharp 0.35.4 (incluye libvips, LGPL-3.0, enlazada dinámicamente) [VERIFICAR], @vercel/blob.

El detalle completo de licencias queda en `docs/LICENCIAS.md` (Parte 6).

---

## Resumen de hallazgos para las siguientes partes

1. **Sin consentimientos:** el registro no pide aceptar la política de datos ni los términos, aunque existan las columnas `accepted_*_at`, que no se usan.
2. ~~Google Fonts~~ → **resuelto**: las fuentes se sirven desde el propio sitio.
3. **Datos sin uso → resuelto:** el documento lo llena recepción cuando haga falta; `is_demo` y `deleted_at` tienen uso previsto (Partes 5 y 6); el MFA ya está (verificación en dos pasos, 2026-09-29); `accepted_*_at` se sustituyó por `consents`.
4. **Sin plazos de conservación** ni purga de sesiones, tokens y notificaciones.
5. **Menores → resuelto en la Parte 2:** su cuenta queda pendiente hasta que el acudiente la vincule y autorice.
6. **Datos de salud** sin autorización explícita previa → **resuelto en la Parte 5**.
7. **Registros del servidor → resuelto** (commit `fa553a7`).
8. **Foto `nino-saque`** con un menor identificable y sin autorización registrada (Parte 6).
