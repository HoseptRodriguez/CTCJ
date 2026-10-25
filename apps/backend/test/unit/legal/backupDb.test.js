import { describe, expect, it } from 'vitest';

import {
  archiveName,
  parseArgs,
  preflightProblem,
  slug,
} from '../../../../../scripts/backup-db.mjs';

describe('npm run db:backup', () => {
  it('names the archive ctcj_<base>_<fecha-hora>_<motivo>.7z', () => {
    const at = new Date(2026, 8, 29, 7, 5);
    expect(archiveName('ctcj_dev', 'Antes de la MFA', at)).toBe(
      'ctcj_dev_2026-09-29_0705_antes_de_la_mfa.7z',
    );
    expect(archiveName('ctcj_test', '', at)).toBe('ctcj_test_2026-09-29_0705_copia.7z');
    expect(slug('Borrar cuentas duplicadas!')).toBe('borrar_cuentas_duplicadas');
  });

  it('reads --db and --motivo', () => {
    expect(parseArgs(['--db', 'ctcj_test', '--motivo', 'antes_mfa'])).toEqual({
      db: 'ctcj_test',
      reason: 'antes_mfa',
    });
    expect(parseArgs(['--motivo=antes_borrar'])).toEqual({
      db: 'ctcj_dev',
      reason: 'antes_borrar',
    });
  });

  it('stops without the password variable, with instructions that never show it', () => {
    const msg = preflightProblem({ env: {}, db: 'ctcj_dev', reason: 'x' });
    expect(msg).toMatch(/Falta la variable de entorno CTCJ_BACKUP_PASSWORD/);
    expect(msg).toMatch(/Read-Host .* -AsSecureString/);
  });

  it('only the club databases, and always with a reason', () => {
    const env = { CTCJ_BACKUP_PASSWORD: 'x' };
    expect(preflightProblem({ env, db: 'postgres', reason: 'x' })).toMatch(/Base no permitida/);
    expect(preflightProblem({ env, db: 'ctcj_dev', reason: '' })).toMatch(/motivo/);
    expect(preflightProblem({ env, db: 'ctcj_dev', reason: 'antes_mfa' })).toBeNull();
  });
});
