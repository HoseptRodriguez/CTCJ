# Pendientes legales y de cumplimiento

> **Importante:** los textos legales del sitio (política de datos, términos, cookies, reembolsos, accesibilidad y autorizaciones) son **una propuesta**. Debe revisarlos un **abogado colombiano** antes de publicar el sitio. Nada de lo que hay en el código ni en esta carpeta afirma que el sitio "cumple la ley".
>
> El **responsable del tratamiento** de los datos personales es el **club**, no los desarrolladores.

Convenciones:

- **[COMPLETAR]**: dato del negocio que debe dar el club.
- **[VERIFICAR]**: dato legal o técnico que hay que confirmar antes de usarlo.

El script `npm run legal:check` (Parte 9) impedirá publicar mientras quede alguno de estos marcadores en las páginas legales o en el pie de página.

Estado: parcial (Partes 1 a 4, 2026-09-28).

---

## 1. Datos del negocio (Ley 1480, art. 50)

| Dato                                       | Estado                                                                             |
| ------------------------------------------ | ---------------------------------------------------------------------------------- |
| Razón social                               | [COMPLETAR]                                                                        |
| NIT                                        | [COMPLETAR]                                                                        |
| Representante legal                        | [COMPLETAR]                                                                        |
| Dirección                                  | Kilómetro 1 vía Fusagasugá – Tibacuy, junto al Conjunto Toscana (dada por el club) |
| Dirección de notificaciones judiciales     | [COMPLETAR]                                                                        |
| Teléfono / WhatsApp                        | +57 310 864 6361 (dado por el club)                                                |
| Correo de contacto                         | [COMPLETAR]                                                                        |
| Correo para datos personales (habeas data) | [COMPLETAR]                                                                        |

## 2. Plazos de conservación de datos

Hoy **no hay ningún plazo definido y no se borra nada automáticamente**. El club debe fijarlos, con su contador y su abogado:

| Datos                                                        | Plazo                                                                               |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Cuenta y perfil tras la eliminación de la cuenta             | Se anonimiza al responder la solicitud (Parte 5). Plazo para atenderla: [COMPLETAR] |
| Facturas, pagos y soportes contables                         | [COMPLETAR: plazo que indique el contador] [VERIFICAR norma contable/tributaria]    |
| Historia clínica y notas de salud                            | [VERIFICAR: Resolución 1995 de 1999 y normas posteriores]                           |
| Sesiones vencidas, tokens de verificación y recuperación, IP | [COMPLETAR] (propuesta técnica: purgar a los 90 días)                               |
| Notificaciones leídas                                        | [COMPLETAR]                                                                         |
| Registro de auditoría (`audit_logs`)                         | [COMPLETAR]                                                                         |
| Prueba de consentimientos (`consents`)                       | [VERIFICAR] (mientras pueda exigirse la prueba)                                     |

## 3. Terceros y transferencias internacionales

Países y regiones de servidor **a completar en los Prompts 6 y 7**, cuando se elijan las regiones:

| Proveedor                              | Estado                                        |
| -------------------------------------- | --------------------------------------------- |
| Render (backend)                       | [VERIFICAR: región]                           |
| Vercel (frontend, si se usa)           | [VERIFICAR: si se usa y en qué región]        |
| Vercel Blob (fotos y videos)           | [VERIFICAR: región del almacén]               |
| Base de datos PostgreSQL (Neon u otro) | [VERIFICAR: proveedor y región]               |
| Resend (correo)                        | [VERIFICAR: país; se entiende Estados Unidos] |

Para cada uno hará falta revisar su contrato de encargado del tratamiento (DPA) y declarar la transmisión o transferencia internacional en la política [VERIFICAR con el abogado].

Google Fonts **ya no se usa** (las fuentes se sirven desde el propio sitio).

## 4. Registro Nacional de Bases de Datos (RNBD)

[VERIFICAR con el club] si está obligado. Según el Decreto 090 de 2018, aplica a sociedades y entidades sin ánimo de lucro con activos totales superiores a 100.000 UVT.

## 5. Imágenes y derechos

| Foto                                  | Riesgo                                                        | Pendiente                                                                                     |
| ------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `nino-saque`                          | **Menor identificable**                                       | Autorización escrita del acudiente. Mientras falte, no se muestra en producción (Parte 6)     |
| `jugador-saque-azul`                  | **Tratada como posible menor** (edad no confirmada)           | Confirmar la edad y, si es menor, la autorización del acudiente. Misma regla que `nino-saque` |
| `jugador-desplazamiento`              | Adulto identificable                                          | Autorización de imagen [COMPLETAR]                                                            |
| `jugador-espera-recepcion`            | Adulto identificable                                          | Autorización de imagen [COMPLETAR]                                                            |
| `academia-chaqueta-orlando-rodriguez` | Orlando Rodríguez, identificable por el nombre en la chaqueta | Su autorización [COMPLETAR]                                                                   |
| Todas las fotos                       | Autor desconocido                                             | Autor y cesión de derechos al club [COMPLETAR] (Ley 23 de 1982)                               |

## 6. Menores de edad

- **Hecho (Parte 2):** la cuenta de un menor queda "Pendiente de autorización del acudiente". Puede entrar y ver información, pero no reservar, no publicar en la Comunidad y no recibir promociones, hasta que su acudiente la vincule (y el club apruebe la vinculación) y acepte la autorización de datos e imagen. La prueba queda en `consents`.
- **Menores registrados hoy:** en `ctcj_dev` hay **0 cuentas pendientes**. Solo 1 usuario tiene fecha de nacimiento (adulto) y no hay tutelas.
- **Resuelto (Parte 5):** la fecha de nacimiento es obligatoria en el registro, y a quien ya tenía cuenta sin ella se le pide antes de continuar. Si alguien miente sobre su edad no se puede detectar [VERIFICAR con el abogado si basta la declaración].
- El texto de la autorización del acudiente (versión 1, `packages/shared/src/constants/consents.js`) es una **propuesta** [VERIFICAR con el abogado].
- **Mensajes promocionales:** hoy el club no envía ninguno; solo se guarda la autorización (con canales). Un menor no puede aceptarlos por sí mismo, y en el registro ni siquiera se le ofrecen. Cuando se envíen, hay que usar `isWithinMarketingHours` (Ley 2300: lunes a viernes 7:00 a. m. – 7:00 p. m., sábados 8:00 a. m. – 3:00 p. m., nunca domingos ni festivos) y solo a quien tenga la autorización vigente.
- **Datos de salud de un menor:** la autorización la da el acudiente desde "Cuentas vinculadas" (separada de la de datos e imagen). El menor no puede darla por sí mismo, pero sí retirarla [VERIFICAR con el abogado].

## 7. Seguridad

- **Doble verificación (MFA) para el personal que accede a datos de salud:** pendiente. Las columnas `mfa_enabled` y `mfa_secret` se conservan para eso. Nivel: **alto**.
- **Registros de PM2 en la máquina de desarrollo** (`~/.pm2/logs/ctcj-backend-out.log`): tienen tokens de sesión de antes del arreglo del 2026-09-28. Conviene vaciarlos (`pm2 flush ctcj-backend`) y cerrar las sesiones de desarrollo abiertas. Nivel: **medio** (solo en desarrollo).

## 8. Licencias por confirmar

- **GSAP** (`gsap`, `@gsap/react`): tiene licencia propia, "Standard no charge", que no es de código abierto. [VERIFICAR] que las condiciones vigentes permiten este uso.
- **Íconos SVG del proyecto:** están dibujados al estilo de Lucide. [VERIFICAR] si alguno se copió de Lucide (licencia ISC, que exige conservar el aviso de licencia).
- **sharp / libvips** (solo en el servidor): libvips tiene licencia LGPL-3.0, con enlace dinámico. [VERIFICAR] (en principio no afecta al código del club).

## 9. Textos legales (Parte 3)

Páginas publicadas: `/privacidad`, `/terminos`, `/cookies`, `/reembolsos` y `/accesibilidad`, todas en su **versión 1** (borrador). El texto está en `packages/shared/src/legal/`.

- **Control de versiones:** cada versión se guarda en `legal_documents` con el hash SHA-256 de su contenido. Si se cambia un texto sin subir la versión, una prueba falla y el servidor se niega a arrancar en producción.
- **Ojo:** completar los datos del negocio cambia el contenido de las páginas, así que la primera versión que se publique será la **2** (hay que actualizar `version`, `publishedOn` y `manifest.json`).

Datos y decisiones pendientes, por documento:

| Documento                  | Pendiente                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Todos                      | **Revisión por un abogado colombiano** antes de publicar                                                                                                                                                                                                                                                                                                                                  |
| Privacidad                 | Proveedores y países de servidor [VERIFICAR]; contratos de transmisión o transferencia internacional (DPA) [VERIFICAR]; plazos de conservación [COMPLETAR]; copias de seguridad cifradas [VERIFICAR]                                                                                                                                                                                      |
| Términos                   | Días de aviso antes de cambiar los términos [COMPLETAR]; plazo de respuesta de PQRS [COMPLETAR] [VERIFICAR norma aplicable]                                                                                                                                                                                                                                                               |
| Reembolsos                 | Plazo de cancelación sin costo [COMPLETAR] (hoy el sistema avisa con 12 horas; el club debe confirmarlo); cancelación tardía y no presentarse [COMPLETAR]; retiro de un plan y mensualidad pagada [COMPLETAR]; plazos y medio de devolución [COMPLETAR]; **en qué casos aplica el retracto** a reservas hechas en línea y pagadas en recepción, y a los planes [VERIFICAR con el abogado] |
| Accesibilidad              | Plazo de respuesta [COMPLETAR]; actualizar las limitaciones con los resultados de la Parte 7                                                                                                                                                                                                                                                                                              |
| Autorización del acudiente | Texto v1 en `constants/consents.js` [VERIFICAR con el abogado]                                                                                                                                                                                                                                                                                                                            |

## 10. Decisiones ya tomadas por el club

- **Fecha de nacimiento obligatoria en el registro** (decidido el 2026-09-28; se implementa en la Parte 5). Sirve para saber si la persona es menor de edad y aplicar la autorización del acudiente, y así lo explica la política (sección 2). A quien ya tiene cuenta sin fecha de nacimiento se le pedirá en su próximo inicio de sesión, con una pantalla simple, antes de continuar.

## 11. Consentimiento de cookies (Parte 4)

- Hay un banner en la primera visita, con tres opciones del mismo tamaño y peso ("Aceptar todas", "Solo necesarias", "Configurar"), y un panel "Configurar cookies" en el pie de página de todas las pantallas.
- La decisión se guarda con su fecha y la versión de la política; si la política cambia de versión, se vuelve a preguntar. Para quien tiene sesión iniciada, queda además como prueba en `consents` (tipo COOKIES, versión, categorías, IP y navegador).
- Lo único opcional hoy es "Letra grande" (Preferencias): no se guarda ni se lee sin consentimiento, y se borra al retirarlo.
- No hay analítica. Si algún día se agrega, debe cargarse **solo** con `hasCookieConsent('ANALYTICS')` y registrarse en la Política de cookies y en `COOKIE_INVENTORY` (nueva versión de la política).
- [VERIFICAR con el abogado] si la decisión de un visitante sin sesión necesita otra prueba además de la que guarda su navegador (hoy no se envía nada al servidor sin sesión, para no crear un dato personal nuevo).

## 12. Consentimientos en formularios y derechos del titular (Parte 5)

**Hecho:**

- **Registro:** fecha de nacimiento obligatoria y tres casillas separadas y sin marcar: autorización de datos (obligatoria, con enlace), Términos (obligatoria, con enlace) y novedades/promociones (opcional, con canal correo o WhatsApp y el horario de la Ley 2300). A un menor no se le ofrecen promociones. Cada aceptación queda en `consents` con versión, fecha, IP y navegador.
- **Cuentas existentes:** antes de continuar, una pantalla pide lo que falte (fecha de nacimiento, aceptación de la política y de los Términos vigentes). Lo mismo pasará cuando cambie la versión de esos textos.
- **Datos de salud:** autorización explícita y opcional (tipo HEALTH_DATA). Sin ella, psicología, neuropsicología y fisioterapia **no pueden** agendar citas ni registrar notas, antecedentes, planes o aptitud (el servidor responde 403 con un mensaje claro para el personal). Lo ya registrado se sigue pudiendo leer. Está en Mi perfil, junto a la autorización para que Administración lea las notas de fisioterapia.
  - **Ojo, datos de desarrollo:** ningún jugador de `ctcj_dev` tiene todavía esta autorización, así que el personal de salud no podrá registrar nada nuevo hasta que cada jugador (o su acudiente) la dé.
- **Comunidad:** antes de la primera publicación o comentario hay que aceptar las reglas y declarar que se tiene permiso de las personas que aparecen en fotos y videos (y de su acudiente si es menor). El servidor lo exige para publicar, comentar y subir videos.
  - **Ojo, datos de desarrollo:** los jugadores que ya publicaban tendrán que aceptar las reglas la próxima vez.
- **Mis datos y privacidad** (Mi CTCJ › Mi perfil): ver, dar y retirar las autorizaciones opcionales; cambiar las cookies; descargar mis datos (JSON, sin datos de salud, como promete la política); corregir datos (en Mi perfil o por solicitud); pedir la eliminación de la cuenta; consultas y reclamos con número de radicado (`CTCJ-AAAA-00001`).
- **Bandeja "Datos personales"** (solo Administración): consultas a 10 días hábiles y reclamos a 15, contados desde el día siguiente al recibo con los festivos de Colombia (Ley 51 de 1983). Aviso cuando quedan 3 días hábiles o menos, o está vencida, y contador en el menú.
- **Eliminación de cuenta:** al responder una solicitud de eliminación, Administración puede anonimizar la cuenta: se reemplazan nombre, correo, teléfono, documento, fecha de nacimiento, foto (se borra el archivo), presentación y estilo de juego; se borra lo publicado en la Comunidad; se cierran todas las sesiones y la cuenta ya no puede entrar. Se conservan, sin nombre, facturas y pagos, registros de salud, la prueba de las autorizaciones y la propia solicitud.

**Pendiente:**

- [VERIFICAR con el abogado] las prórrogas (5 días hábiles más para consultas y 8 para reclamos): hoy la bandeja no las registra; habría que avisar a la persona antes del vencimiento.
- [VERIFICAR] si el día del recibo cuenta, y qué pasa con una solicitud que llega un sábado, domingo o festivo (hoy: el plazo empieza el día hábil siguiente).
- [VERIFICAR] reclamo incompleto (art. 15: 5 días para completarlo; a los 2 meses se entiende desistido): hoy no hay un estado para eso.
- [COMPLETAR] el correo de datos personales (habeas data) como canal alterno para quien no tiene cuenta.
- La respuesta de una solicitud solo se ve en Mi CTCJ: [VERIFICAR] si además hay que enviarla por correo.
- La copia de los datos de salud se entrega hoy por consulta; [VERIFICAR] el procedimiento (historia clínica: Resolución 1995 de 1999).
- Textos de las autorizaciones cortas (salud, reglas de la Comunidad, promociones), versión 1 en `packages/shared/src/legal/authorizations.js`: [VERIFICAR con el abogado].
- Festivos: calculados por regla, no por lista oficial. [VERIFICAR] cada año con el calendario oficial.
