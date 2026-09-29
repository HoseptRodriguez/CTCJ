# Base de datos: copias cifradas y restauración

Las bases de desarrollo (`ctcj_dev`) y de pruebas (`ctcj_test`) viven en el contenedor Docker `ctcj-postgres` (usuario `ctcj`). Tienen datos personales, incluidos datos de salud, así que **toda copia se guarda cifrada**. Desde el 2026-09-29, las copias previas a una migración o a un borrado se hacen **siempre** con el script de este documento, nunca como un `.sql` suelto.

## 1. Preparar la contraseña (una sola vez)

El script lee la contraseña **solo** de la variable de entorno de Windows `CTCJ_BACKUP_PASSWORD`. No se escribe en archivos del proyecto, commits, registros ni en la pantalla.

En PowerShell (la escribes cuando te la pida; no se ve ni queda en el historial):

```powershell
$p = Read-Host 'Contraseña de las copias' -AsSecureString
[Environment]::SetEnvironmentVariable('CTCJ_BACKUP_PASSWORD', [Runtime.InteropServices.Marshal]::PtrToStringAuth([Runtime.InteropServices.Marshal]::SecureStringToBSTR($p)), 'User')
```

Después abre una terminal nueva (las que ya estaban abiertas no ven la variable).

- Guarda también la contraseña en el gestor de contraseñas del club: **sin ella las copias no se pueden abrir**.
- No uses una contraseña que aparezca en el código (por ejemplo, en pruebas) ni que uses en otro servicio.
- Para cambiarla: repite los dos comandos. Las copias viejas siguen necesitando la contraseña con la que se hicieron.

Requisitos: Docker con el contenedor `ctcj-postgres` en marcha y 7-Zip instalado (`winget install 7zip.7zip`).

## 2. Crear una copia

```powershell
npm run db:backup -- --db ctcj_dev --motivo antes_mfa
```

- `--db`: `ctcj_dev` (por defecto) o `ctcj_test`.
- `--motivo`: obligatorio, corto (por qué se hace la copia).

Qué hace, en orden:

1. `pg_dump` de la base dentro del contenedor.
2. Comprime y cifra con 7-Zip: formato 7z, **AES-256** y `-mhe=on` (también cifra los nombres de los archivos de dentro).
3. Guarda `C:\Users\<usuario>\ctcj-backups\ctcj_<base>_<fecha-hora>_<motivo>.7z`, por ejemplo `ctcj_dev_2026-09-29_0705_antes_mfa.7z`.
4. Comprueba el archivo con `7z t`: debe decir "Everything is Ok".
5. **Siempre** borra el `.sql` temporal, también si algo falla (y si falla, borra el `.7z` incompleto).

Si falta la variable, la base no es una de las dos permitidas o no hay motivo, el script se detiene sin hacer nada y explica qué falta. Opcionales: `CTCJ_BACKUP_DIR` (otra carpeta), `CTCJ_PG_CONTAINER`, `CTCJ_PG_USER`, `SEVEN_ZIP_PATH`.

## 3. Restaurar una copia

Restaurar **reemplaza** los datos actuales de la base. Hazlo solo cuando sea necesario y, si la base actual tiene algo que valga la pena, saca antes una copia de ella con el paso 2.

1. Extrae el `.sql` en una carpeta temporal (7-Zip pide la contraseña):

   ```powershell
   & 'C:\Program Files\7-Zip\7z.exe' x "$env:USERPROFILE\ctcj-backups\ctcj_dev_2026-09-29_0705_antes_mfa.7z" -o"$env:TEMP\ctcj-restaurar"
   ```

2. Detén el backend para que nadie escriba mientras tanto: `pm2 stop ctcj-backend`.
3. Crea la base de nuevo, vacía, y carga la copia:

   ```powershell
   docker exec ctcj-postgres dropdb -U ctcj --if-exists ctcj_dev
   docker exec ctcj-postgres createdb -U ctcj ctcj_dev
   Get-Content "$env:TEMP\ctcj-restaurar\ctcj_dev_2026-09-29_0705_antes_mfa.sql" -Raw | docker exec -i ctcj-postgres psql -U ctcj -d ctcj_dev -v ON_ERROR_STOP=1
   ```

4. Comprueba que las migraciones quedaron al día: `npx prisma migrate status` (en `apps/backend`, con el `DATABASE_URL` de esa base).
5. Arranca el backend (`pm2 start ctcj-backend`) y revisa `/health` y un inicio de sesión.
6. **Borra el `.sql` extraído** (`Remove-Item -Recurse "$env:TEMP\ctcj-restaurar"`): no debe quedar ningún `.sql` sin cifrar.

## 4. Antes de una migración

1. Aplicarla primero en `ctcj_test` y luego en `ctcj_dev`.
2. Antes de cada una: `npm run db:backup -- --db <base> --motivo antes_<tema>`.
3. `npx prisma migrate deploy` (nunca `migrate dev`), `npx prisma migrate status`, `pm2 restart ctcj-backend`, `/health` e inicio de sesión.

## 5. Copias antiguas

- `ctcj-backups-2026-09-29.7z`: las 12 copias `.sql` hechas antes del 2026-09-29, cifradas en un solo archivo.
- Plazo para borrar copias viejas: [COMPLETAR] (ver `docs/LEGAL_PENDIENTES.md`, sección 2).
