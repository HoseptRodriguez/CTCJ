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

El registro de cada foto (origen, autor, personas reconocibles, menores, autorización) está en `apps/frontend/src/lib/photo-rights.js`, y el resumen en `docs/LICENCIAS.md`.

| Foto                                  | Riesgo                                                        | Estado (Parte 6)                                                                                    |
| ------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `nino-saque`                          | **Menor identificable**                                       | **Retirada del sitio.** Se publicará solo con la autorización escrita del acudiente [COMPLETAR]     |
| `jugador-saque-azul`                  | **Tratada como posible menor** (edad no confirmada)           | **Retirada del sitio.** Confirmar la edad y, si es menor, la autorización del acudiente [COMPLETAR] |
| `jugador-desplazamiento`              | Adulto identificable                                          | En el sitio, **pendiente de autorización** de imagen [COMPLETAR]                                    |
| `jugador-espera-recepcion`            | Adulto identificable                                          | En el sitio, **pendiente de autorización** de imagen [COMPLETAR]                                    |
| `academia-chaqueta-orlando-rodriguez` | Orlando Rodríguez, identificable por el nombre en la chaqueta | En el sitio, **pendiente de su autorización** [COMPLETAR]                                           |
| Todas las fotos                       | Autor desconocido                                             | Autor y cesión de derechos al club [COMPLETAR] (Ley 23 de 1982)                                     |

- En Inicio, "Escuela infantil" y "Competencia y ranking" ahora usan fotos sin menores, y Mi CTCJ cambió la foto de su sección de ranking.
- **Bloqueo en el build:** `npm run build` falla si una foto con menores sin autorización está en `public/img/club` o la usa el código, o si hay una foto sin registrar en `photo-rights.js`. `npm run photos` no genera esas fotos.
- En `canchas-panoramica-nubes` se ven logos de patrocinadores en las vallas y personas lejanas (no reconocibles). [VERIFICAR] que el club puede mostrar esas marcas.
- [VERIFICAR con el abogado] si las fotos de adultos pueden seguir publicadas mientras llega su autorización, o si hay que retirarlas también.
- Arreglado: la imagen para compartir en redes (`og:image`) apuntaba a un archivo que no existe; ahora es la foto panorámica de las canchas (sin personas).

## 6. Menores de edad

- **Hecho (Parte 2):** la cuenta de un menor queda "Pendiente de autorización del acudiente". Puede entrar y ver información, pero no reservar, no publicar en la Comunidad y no recibir promociones, hasta que su acudiente la vincule (y el club apruebe la vinculación) y acepte la autorización de datos e imagen. La prueba queda en `consents`.
- **Menores registrados hoy:** en `ctcj_dev` hay **0 cuentas pendientes**. Solo 1 usuario tiene fecha de nacimiento (adulto) y no hay tutelas.
- **Resuelto (Parte 5):** la fecha de nacimiento es obligatoria en el registro, y a quien ya tenía cuenta sin ella se le pide antes de continuar. Si alguien miente sobre su edad no se puede detectar [VERIFICAR con el abogado si basta la declaración].
- El texto de la autorización del acudiente (versión 1, `packages/shared/src/constants/consents.js`) es una **propuesta** [VERIFICAR con el abogado].
- **Mensajes promocionales:** hoy el club no envía ninguno; solo se guarda la autorización (con canales). Un menor no puede aceptarlos por sí mismo, y en el registro ni siquiera se le ofrecen. Cuando se envíen, hay que usar `isWithinMarketingHours` (Ley 2300: lunes a viernes 7:00 a. m. – 7:00 p. m., sábados 8:00 a. m. – 3:00 p. m., nunca domingos ni festivos) y solo a quien tenga la autorización vigente.
- **Datos de salud de un menor:** la autorización la da el acudiente desde "Cuentas vinculadas" (separada de la de datos e imagen). El menor no puede darla por sí mismo, pero sí retirarla [VERIFICAR con el abogado].

## 7. Seguridad y otros riesgos (Parte 8)

**Hecho en la Parte 8:** encabezados de seguridad endurecidos (CSP estricta sin fuentes ni estilos externos, `frame-ancestors 'none'`, HSTS de un año, `Permissions-Policy`), con prueba automática; los errores de base de datos ya no se escriben completos en los registros (podían repetir datos de salud); regla de arquitectura que impide que el módulo clínico envíe notificaciones o correos; la redirección después de entrar solo acepta rutas del propio sitio; procedimiento de incidentes y copias de seguridad en `docs/INCIDENTES.md`. La cookie de sesión ya era `HttpOnly`, `SameSite=Strict`, `Secure` en producción y limitada a `/api/auth` (ahora también con prueba).

| Riesgo                                                                                                                                                                              | Nivel    | Qué hacer                                                                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Sin doble verificación (MFA)** para el personal que ve datos de salud y para Administración. Las columnas `mfa_enabled` y `mfa_secret` se conservan para eso                      | **Alto** | Implementar MFA (por ejemplo, código de una aplicación) para Administración, Psicología, Neuropsicología y Fisioterapia |
| **Copias de la base sin cifrar** en el equipo de desarrollo (`C:\Users\KTFUS\ctcj-backups`, una antes de cada migración)                                                            | **Alto** | Cifrarlas con 7-Zip (AES-256) o borrarlas; de aquí en adelante, copias cifradas (`docs/INCIDENTES.md`, sección 4)       |
| Copias de producción: no se sabe si el proveedor las cifra, cuánto las guarda ni quién las restaura [VERIFICAR]                                                                     | **Alto** | Confirmarlo con Render antes de publicar                                                                                |
| Datos de salud en la base **sin cifrado por campo**; dependen del cifrado del proveedor [VERIFICAR]                                                                                 | Medio    | Confirmar el cifrado en reposo del proveedor; evaluar cifrar las notas clínicas                                         |
| **Sesiones largas** en computadores compartidos (recepción): la sesión se renueva hasta 30 días                                                                                     | Medio    | Botón "Salir" visible (ya está); evaluar sesiones más cortas para el personal y cierre por inactividad                  |
| **Fotos y videos por enlace:** los archivos de la Comunidad y las fotos de perfil se pueden abrir con su enlace sin iniciar sesión (enlaces difíciles de adivinar)                  | Medio    | Evaluar almacenamiento privado con enlaces firmados que vencen                                                          |
| Proveedores en el exterior (Render, Vercel, Resend): transferencia internacional [VERIFICAR]                                                                                        | Medio    | Ver sección 3; contratos de transmisión (DPA)                                                                           |
| **No se borra nada automáticamente** (sesiones vencidas, códigos de verificación, notificaciones viejas)                                                                            | Medio    | Definir plazos (sección 2) y una tarea que los purgue                                                                   |
| `react-router-dom` 6.30: dos avisos de seguridad moderados (redirección abierta con `\` y un fallo del renderizado en servidor, que este sitio no usa). La redirección ya se valida | Bajo     | Actualizar a la versión 7 cuando se pueda (cambio mayor)                                                                |
| **Registros de PM2 en la máquina de desarrollo:** tenían tokens de sesión de antes del arreglo del 2026-09-28; ya se vaciaron con `pm2 flush`                                       | Bajo     | Nada más                                                                                                                |
| Contraseñas: argon2, mínimo de longitud con letras y números, bloqueo tras intentos fallidos y límite de peticiones                                                                 | —        | Ya está                                                                                                                 |
| Acceso de Administración a notas de fisioterapia: solo con autorización del jugador y con registro de cada lectura                                                                  | —        | Ya está                                                                                                                 |

## 8. Licencias por confirmar

El detalle está en `docs/LICENCIAS.md`, y los avisos que piden las licencias se publican en `/licencias-terceros.txt` (enlazado en el pie de página como "Avisos de terceros").

- **GSAP** (`gsap`, `@gsap/react`): licencia propia "Standard no charge", que no es de código abierto. [VERIFICAR] que las condiciones vigentes permiten este uso. Se puede quitar sin afectar el funcionamiento.
- **Íconos:** **derivan de Lucide** (el trazo del corazón es el mismo). Licencia ISC: ya se publica su aviso. [VERIFICAR] el texto exacto contra el `LICENSE` oficial de Lucide.
- **sharp / libvips** (solo en el servidor): libvips tiene licencia LGPL-3.0, con enlace dinámico. [VERIFICAR] (en principio no afecta al código del club).
- **Logo de la Academia Orlando Rodríguez:** [VERIFICAR] quién es su titular.

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
| Accesibilidad              | Plazo de respuesta [COMPLETAR]. Limitaciones actualizadas con la Parte 7 (versión 2); detalle en `docs/ACCESIBILIDAD.md`                                                                                                                                                                                                                                                                  |
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

## 13. Afirmaciones publicitarias (Ley 1480 de 2011, publicidad engañosa)

Mientras el club no entregue pruebas, el sitio usa la **versión segura**. Para volver a la frase del folleto hace falta la prueba indicada (con nombre, fecha y documento).

| Dónde                          | Frase del folleto o del diseño                                                                                       | Versión segura que usa el sitio                                                                                                    | Prueba que haría falta                                                                    |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| El club, "¿Por qué elegirnos?" | "un equipo de entrenadores **altamente calificados**"                                                                | "un equipo de entrenadores dedicados a la enseñanza del tenis"                                                                     | Títulos, certificaciones o formación de cada entrenador                                   |
| El club, "¿Por qué elegirnos?" | "instalaciones **de primer nivel**"                                                                                  | "instalaciones cuidadas"                                                                                                           | Norma técnica o certificación de las canchas                                              |
| El club, "¿Por qué elegirnos?" | "ya sea que busquen competir **a nivel profesional**"                                                                | "ya sea que busquen competir"                                                                                                      | Jugadores formados que hoy compitan como profesionales                                    |
| El club, "Espacios"            | "canchas **de última generación**" y "superficies **de primer nivel que garantizan** un rendimiento óptimo y seguro" | "tres canchas de arcilla, dos de ellas con iluminación [...] Cuidamos su mantenimiento para que juegues con comodidad y seguridad" | Ficha técnica de las canchas; no se puede "garantizar" un resultado                       |
| El club, "Historia"            | "un proyecto que **hoy es un referente en la región**"                                                               | "un proyecto que hoy sigue creciendo"                                                                                              | Reconocimientos o rankings regionales con fecha                                           |
| El club, "Historia"            | "seguimos siendo **la academia líder en la región**"                                                                 | "seguimos contribuyendo al desarrollo del tenis"                                                                                   | Un dato comparativo verificable (por ejemplo, número de alumnos frente a otras academias) |
| El club, "Historia"            | "hemos formado jugadores que han obtenido **excelentes resultados** en competiciones"                                | "Acompañamos a nuestros jugadores en sus entrenamientos y en sus competencias"                                                     | Resultados concretos: jugador (con su autorización), torneo, fecha y puesto               |
| El club, "Historia"            | "no solo formamos **campeones**"                                                                                     | (se quitó)                                                                                                                         | Campeonatos ganados por alumnos, con nombre y fecha                                       |
| Inicio                         | "3 canchas de arcilla, **abiertas todos los días**"                                                                  | "3 canchas de arcilla para reservar en línea" y "Reservas de 5:00 a. m. a 10:00 p. m."                                             | Horario real, incluidos domingos y festivos [COMPLETAR]                                   |
| Inicio                         | "Reserva tu cancha **en un minuto**"                                                                                 | "Reserva tu cancha en línea"                                                                                                       | No aplica (es una promesa de tiempo que no se puede asegurar)                             |
| El club y metadatos            | "**Más de 10 años** formando tenistas" / "más de una década"                                                         | Se mantiene (dato del club)                                                                                                        | Fecha de inicio de la academia [VERIFICAR]                                                |
| El club, "Visión"              | "Ser **el referente principal** en la formación de tenistas en la región"                                            | Se mantiene: es una meta, no una afirmación sobre hoy                                                                              | —                                                                                         |
| Metadatos (buscadores)         | "Iniciación, competencia y **alto rendimiento**"                                                                     | Se mantiene                                                                                                                        | [VERIFICAR] que el club ofrece un programa de alto rendimiento                            |

- **"En vivo":** no aparece en el código actual.
- **Reseñas, testimonios, estrellas, cifras de clientes:** no hay ninguno en el sitio, ni en las semillas (`prisma/seed.js` solo crea el club, los roles, los permisos y las canchas).
- **Datos de demostración:** hoy ninguna cuenta está marcada `is_demo`. En producción, el servidor **no arranca** si encuentra alguna (hay que eliminarla o anonimizarla antes).

## 14. Bloqueo de publicación (Parte 9)

- `npm run legal:check` falla mientras quede algún `[COMPLETAR]` o `[VERIFICAR]` en las páginas legales (y en las autorizaciones que se aceptan dentro del sitio), en los datos del negocio que muestra el pie de página o en el propio pie, o si hay una foto de un menor sin la autorización de su acudiente. Dice qué falta y dónde.
- Se ejecuta primero en `npm run build`, que es el build de producción que usa Render: **el sitio no se puede publicar hasta que el club complete los datos** y el abogado revise los textos.
- Hoy (2026-09-28) faltan 41 datos o revisiones. Para desbloquear: completar lo de las secciones 1, 2 y 9, cambiar cada `[VERIFICAR]` por el texto confirmado por el abogado y, como cambia el contenido, subir la `version` de cada documento y actualizar `manifest.json` (sección 9).
- El CI compila el frontend (`npm run build -w apps/frontend`, que ya bloquea las fotos de menores) pero no ejecuta este bloqueo, para no quedar en rojo mientras el club completa los datos.
