import { describe, expect, it } from 'vitest';

import { resolvePostLoginRoute } from './postLoginRoute.js';

describe('resolvePostLoginRoute', () => {
  it('sends ADMINISTRADOR to the Admin Dashboard', () => {
    expect(resolvePostLoginRoute(['USUARIO', 'ADMINISTRADOR'])).toBe('/staff/panel');
  });

  it('sends RECEPCION to the Admin Dashboard', () => {
    expect(resolvePostLoginRoute(['USUARIO', 'RECEPCION'])).toBe('/staff/panel');
  });

  it('sends ENTRENADOR to the Coach Dashboard', () => {
    expect(resolvePostLoginRoute(['USUARIO', 'ENTRENADOR'])).toBe('/staff/panel-entrenador');
  });

  it('prioritizes ADMINISTRADOR over ENTRENADOR for a user with both roles', () => {
    expect(resolvePostLoginRoute(['USUARIO', 'ADMINISTRADOR', 'ENTRENADOR'])).toBe('/staff/panel');
  });

  it.each(['PSICOLOGO', 'NEUROPSICOLOGO', 'FISIOTERAPEUTA'])(
    'sends %s to the clinical module',
    (role) => {
      expect(resolvePostLoginRoute(['USUARIO', role])).toBe('/staff/clinico');
    },
  );

  it('sends JUGADOR to the Player Dashboard', () => {
    expect(resolvePostLoginRoute(['USUARIO', 'JUGADOR'])).toBe('/mi-ctcj');
  });

  it('sends a plain USUARIO (not yet affiliated) to the Player Dashboard too', () => {
    expect(resolvePostLoginRoute(['USUARIO'])).toBe('/mi-ctcj');
  });

  it('defaults to the Player Dashboard for an empty role list', () => {
    expect(resolvePostLoginRoute([])).toBe('/mi-ctcj');
  });
});
