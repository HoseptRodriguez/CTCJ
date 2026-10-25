# Incidentes de seguridad y copias de seguridad

Procedimiento propuesto para el Club de Tenis Ciudad Jardín, **responsable del tratamiento** de los datos personales (Ley 1581 de 2012). Debe revisarlo un abogado colombiano antes de adoptarlo. Todo lo marcado **[VERIFICAR]** o **[COMPLETAR]** está pendiente.

## 1. Qué es un incidente

Cualquier situación en la que datos personales se pierdan, se destruyan, se alteren, o los vea o use alguien que no debía. Por ejemplo:

- Alguien entra con la cuenta de otra persona o del personal.
- Se comparte por error un listado, una factura o una copia de seguridad.
- Se pierde o roban un computador o un teléfono con sesión abierta en la consola, o con copias de la base de datos.
- Un proveedor (hosting, correo, almacenamiento) avisa de una filtración.
- Aparecen datos de salud (psicología, neuropsicología, fisioterapia) donde no deberían: un registro del servidor, un correo, un mensaje o un archivo.

## 2. Quién hace qué

| Rol                                | Quién                                     | Contacto    |
| ---------------------------------- | ----------------------------------------- | ----------- |
| Responsable del incidente (decide) | Representante del club [COMPLETAR nombre] | [COMPLETAR] |
| Oficial de protección de datos     | [COMPLETAR]                               | [COMPLETAR] |
| Soporte técnico (encargado)        | Desarrolladores del sitio [COMPLETAR]     | [COMPLETAR] |
| Asesor jurídico                    | [COMPLETAR]                               | [COMPLETAR] |

Los encargados (desarrolladores y proveedores) avisan al club **en cuanto** sepan de un incidente; el club decide y hace los reportes.

## 3. Pasos

1. **Avisar enseguida** al responsable del incidente, por teléfono o WhatsApp. Anotar la hora.
2. **Contener**, sin borrar pruebas:
   - Cerrar las sesiones afectadas. Desactivar la cuenta comprometida desde la consola. Si es del personal, cambiar su contraseña.
   - Si se filtró una clave del servidor (`JWT_ACCESS_SECRET`, `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, claves de correo): cambiarla en Render y en el proveedor. Cambiar `JWT_ACCESS_SECRET` cierra todas las sesiones.
   - Si un archivo público no debía serlo (foto, video, copia): borrarlo del almacenamiento.
3. **Registrar** en la bitácora de incidentes (plantilla abajo): qué pasó, desde cuándo, qué datos, cuántas personas, si hay datos de salud o de menores, qué se hizo.
4. **Evaluar el riesgo** para las personas. Es alto si incluye datos de salud, datos de menores, documentos de identidad, contraseñas o datos de pago.
5. **Reportar a la Superintendencia de Industria y Comercio (SIC)** en el Registro Nacional de Bases de Datos, módulo de reporte de incidentes. Plazo: [VERIFICAR: la SIC indica 15 días hábiles desde que se detecta; confirmar la norma vigente].
6. **Avisar a las personas afectadas** cuando el incidente las pueda perjudicar, en lenguaje sencillo: qué pasó, qué datos, qué hizo el club y qué pueden hacer ellas (por ejemplo, cambiar su contraseña). [VERIFICAR con el abogado] cuándo es obligatorio.
7. **Corregir la causa** y documentar el cambio.
8. **Revisar** a los 30 días si las medidas funcionaron.

### Plantilla de la bitácora

| Campo                                | Respuesta |
| ------------------------------------ | --------- |
| Fecha y hora en que se detectó       |           |
| Quién lo detectó y cómo              |           |
| Qué pasó                             |           |
| Datos afectados (tipos)              |           |
| ¿Datos de salud? ¿Datos de menores?  |           |
| Número aproximado de personas        |           |
| Medidas de contención (con hora)     |           |
| Reporte a la SIC (fecha y número)    |           |
| Aviso a las personas (fecha y medio) |           |
| Causa y corrección                   |           |

## 4. Copias de seguridad

- **Producción:** [VERIFICAR] qué copias hace el proveedor de la base de datos (Render), si están cifradas, cuánto tiempo se guardan y quién puede restaurarlas.
- **Copias manuales** (`pg_dump`): contienen **todos** los datos, incluidos los de salud. Por eso:
  - **Siempre cifradas**, con `npm run db:backup` (7-Zip, AES-256, nombres ocultos; comprueba el archivo y borra el `.sql`). Cómo crearlas y restaurarlas: `docs/DATABASE.md`.
  - La contraseña se guarda aparte (gestor de contraseñas del club), nunca junto a la copia.
  - Solo en equipos del club con disco cifrado (BitLocker, FileVault) y acceso restringido. Nunca en correos, chats ni carpetas compartidas.
  - Borrarlas cuando ya no sirvan. Plazo: [COMPLETAR].
  - Probar cada cierto tiempo que una copia se puede restaurar (en una base aparte).
- **Equipo de desarrollo:** desde el 2026-09-29 todas las copias están cifradas en `C:\Users\KTFUS\ctcj-backups` (las 12 anteriores, en `ctcj-backups-2026-09-29.7z`) y no queda ningún `.sql` sin cifrar.

## 5. Qué hace el sistema para prevenir

- Registros del servidor sin tokens, cookies, IP, cuerpos de las peticiones ni el texto de los errores de base de datos (que puede repetir datos de salud).
- Los datos de salud no salen por notificaciones, correos ni exportaciones: una regla de arquitectura impide que el módulo clínico use notificaciones o correo; la descarga "Mis datos" no los incluye; los CSV de Finanzas no los tienen.
- Cada lectura de notas clínicas por la administración queda registrada (`audit_logs`).
- Contraseñas con argon2, bloqueo tras varios intentos fallidos, límite de peticiones en el inicio de sesión y el registro.
- Cookie de sesión `HttpOnly`, `SameSite=Strict`, `Secure` en producción y limitada a `/api/auth`.
- Encabezados de seguridad: CSP estricta, HSTS de un año, `nosniff`, `no-referrer`, sin marcos (`frame-ancestors 'none'`) y `Permissions-Policy` sin cámara, micrófono ni ubicación.
