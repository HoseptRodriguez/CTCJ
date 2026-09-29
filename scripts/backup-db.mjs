// npm run db:backup -- --db ctcj_dev --motivo antes_mfa
//
// Encrypted database backup (docs/DATABASE.md):
//   1. pg_dump of the database (inside the Docker container ctcj-postgres),
//   2. compressed and encrypted with 7-Zip (7z, AES-256, -mhe=on so even the
//      file name inside is hidden) into C:\Users\<you>\ctcj-backups as
//      ctcj_<base>_<fecha-hora>_<motivo>.7z,
//   3. checked with "7z t" ("Everything is Ok"),
//   4. and the plain .sql is always deleted, even if something fails.
//
// The password is read ONLY from the Windows environment variable
// CTCJ_BACKUP_PASSWORD. It is never written to files, logs or the console.
import { spawn } from 'node:child_process';
import { createWriteStream, existsSync } from 'node:fs';
import { rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const PASSWORD_VAR = 'CTCJ_BACKUP_PASSWORD';
const ALLOWED_DBS = ['ctcj_dev', 'ctcj_test'];

/** "Antes de la MFA!" -> "antes_de_la_mfa" (safe in a file name). */
export function slug(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

/** ctcj_<base>_<YYYY-MM-DD_HHMM>_<motivo>.7z, local time of the machine. */
export function archiveName(db, reason, date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(
    date.getHours(),
  )}${pad(date.getMinutes())}`;
  const base = db.replace(/^ctcj_/, '');
  return `ctcj_${base}_${stamp}_${slug(reason) || 'copia'}.7z`;
}

/** --db ctcj_dev --motivo antes_mfa (also accepts --reason). */
export function parseArgs(argv) {
  const args = { db: 'ctcj_dev', reason: '' };
  for (let i = 0; i < argv.length; i += 1) {
    const [key, inline] = argv[i].split('=');
    const value = inline ?? argv[i + 1];
    if (key === '--db') args.db = value;
    if (key === '--motivo' || key === '--reason') args.reason = value;
    if (inline === undefined && ['--db', '--motivo', '--reason'].includes(key)) i += 1;
  }
  return args;
}

/**
 * What stops the backup before doing anything.
 * @returns {string|null} a message for the person, or null when all is ready
 */
export function preflightProblem({ env, db, reason }) {
  if (!env[PASSWORD_VAR]) {
    return [
      `Falta la variable de entorno ${PASSWORD_VAR} con la contraseña de las copias.`,
      'Créala una sola vez en PowerShell. La escribes tú cuando la pida, sin que se vea en pantalla',
      'ni quede en el historial ni en ningún archivo del proyecto:',
      "  $p = Read-Host 'Contraseña de las copias' -AsSecureString",
      `  [Environment]::SetEnvironmentVariable('${PASSWORD_VAR}', [Runtime.InteropServices.Marshal]::PtrToStringAuth([Runtime.InteropServices.Marshal]::SecureStringToBSTR($p)), 'User')`,
      'Luego abre una terminal nueva y vuelve a ejecutar la copia.',
    ].join('\n');
  }
  if (!ALLOWED_DBS.includes(db)) return `Base no permitida: ${db}. Usa ${ALLOWED_DBS.join(' o ')}.`;
  if (!slug(reason)) return 'Indica el motivo de la copia, por ejemplo: --motivo antes_mfa';
  return null;
}

function find7z() {
  const candidates = [
    process.env.SEVEN_ZIP_PATH,
    'C:\\Program Files\\7-Zip\\7z.exe',
    'C:\\Program Files (x86)\\7-Zip\\7z.exe',
  ].filter(Boolean);
  return candidates.find((p) => existsSync(p)) ?? '7z';
}

/** Runs a program; resolves with its output. Arguments never go through a shell. */
function run(command, args, { stdoutFile, cwd } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, windowsHide: true });
    let out = '';
    let err = '';
    // When writing to a file, wait until it's fully on disk, not just until the process ends.
    const file = stdoutFile ? createWriteStream(stdoutFile) : null;
    const written = file
      ? new Promise((ok, fail) => file.on('finish', ok).on('error', fail))
      : Promise.resolve();
    if (file) child.stdout.pipe(file);
    else child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `${path.basename(command)} terminó con código ${code}: ${err.trim().slice(0, 300)}`,
          ),
        );
        return;
      }
      written.then(() => resolve(out), reject);
    });
  });
}

async function main() {
  const { db, reason } = parseArgs(process.argv.slice(2));
  const problem = preflightProblem({ env: process.env, db, reason });
  if (problem) {
    console.error(`\n${problem}\n`);
    process.exit(1);
  }
  const password = process.env[PASSWORD_VAR];
  const dir = process.env.CTCJ_BACKUP_DIR ?? path.join(os.homedir(), 'ctcj-backups');
  const container = process.env.CTCJ_PG_CONTAINER ?? 'ctcj-postgres';
  const pgUser = process.env.CTCJ_PG_USER ?? 'ctcj';
  const archive = archiveName(db, reason);
  const sqlName = archive.replace(/\.7z$/, '.sql');
  const sqlPath = path.join(dir, sqlName);
  const archivePath = path.join(dir, archive);
  const sevenZip = find7z();

  try {
    console.log(`1/3 Copiando la base ${db}…`);
    await run('docker', ['exec', container, 'pg_dump', '-U', pgUser, db], { stdoutFile: sqlPath });
    const { size } = await stat(sqlPath);
    if (size === 0) throw new Error('pg_dump no produjo datos.');

    console.log('2/3 Cifrando con 7-Zip (AES-256, nombres ocultos)…');
    await run(
      sevenZip,
      ['a', '-t7z', '-mhe=on', '-mx=9', `-p${password}`, '-y', archive, sqlName],
      {
        cwd: dir,
      },
    );

    console.log('3/3 Comprobando el archivo…');
    const test = await run(sevenZip, ['t', `-p${password}`, archive], { cwd: dir });
    if (!test.includes('Everything is Ok')) throw new Error('7z t no dijo "Everything is Ok".');

    const { size: archived } = await stat(archivePath);
    console.log(`\nCopia cifrada lista: ${archivePath} (${Math.round(archived / 1024)} KB)\n`);
  } catch (err) {
    await rm(archivePath, { force: true });
    console.error(`\nNo se pudo hacer la copia: ${err.message}\n`);
    process.exitCode = 1;
  } finally {
    // Never leave the unencrypted dump behind.
    await rm(sqlPath, { force: true });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  await main();
}
