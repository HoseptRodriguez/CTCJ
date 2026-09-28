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

| Datos                                                        | Plazo                                                                            |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Cuenta y perfil tras la eliminación de la cuenta             | [COMPLETAR] (se anonimizará, Parte 5)                                            |
| Facturas, pagos y soportes contables                         | [COMPLETAR: plazo que indique el contador] [VERIFICAR norma contable/tributaria] |
| Historia clínica y notas de salud                            | [VERIFICAR: Resolución 1995 de 1999 y normas posteriores]                        |
| Sesiones vencidas, tokens de verificación y recuperación, IP | [COMPLETAR] (propuesta técnica: purgar a los 90 días)                            |
| Notificaciones leídas                                        | [COMPLETAR]                                                                      |
| Registro de auditoría (`audit_logs`)                         | [COMPLETAR]                                                                      |
| Prueba de consentimientos (`consents`)                       | [VERIFICAR] (mientras pueda exigirse la prueba)                                  |

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
- **Limitación:** un menor que no escriba su fecha de nacimiento y no esté vinculado a un acudiente **no se puede detectar**. [VERIFICAR con el abogado] si hay que pedir la fecha de nacimiento (o una declaración de mayoría de edad) en el registro. Se propone resolverlo en la Parte 5.
- El texto de la autorización del acudiente (versión 1, `packages/shared/src/constants/consents.js`) es una **propuesta** [VERIFICAR con el abogado].
- **Mensajes promocionales:** hoy no existen. Cuando existan (Parte 5), las cuentas pendientes y las de menores sin autorización no deben recibirlos.

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
