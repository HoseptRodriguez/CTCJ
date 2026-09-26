import { describe, expect, it } from 'vitest';

import { splitForBottomBar, staffNavFor } from './staffNav.js';

const keys = (groups) => groups.flatMap((g) => g.items.map((i) => i.key));
const home = (groups) => groups[0].items.find((i) => i.key === 'inicio').to;

describe('staffNavFor — same permission matrix as the routes', () => {
  it('Administrador sees everything, with Inicio on the admin panel', () => {
    const nav = staffNavFor(['USUARIO', 'ADMINISTRADOR']);
    expect(keys(nav)).toEqual([
      'inicio',
      'cobros',
      'entrenador',
      'clinico',
      'membresias',
      'solicitudes',
      'notas',
      'competicion',
      'torneos',
      'finanzas',
      'planes',
      'precios',
      'comunidad',
    ]);
    expect(home(nav)).toBe('/staff/panel');
  });

  it('Recepción: day-to-day, memberships, competition and moderation; no admin-only pages', () => {
    const nav = staffNavFor(['USUARIO', 'RECEPCION']);
    expect(keys(nav)).toEqual([
      'inicio',
      'cobros',
      'clinico',
      'membresias',
      'competicion',
      'torneos',
      'comunidad',
    ]);
    expect(home(nav)).toBe('/staff/panel');
  });

  it('Entrenador: Inicio is the class panel (not listed twice), notes and competition', () => {
    const nav = staffNavFor(['USUARIO', 'ENTRENADOR']);
    expect(keys(nav)).toEqual(['inicio', 'notas', 'competicion', 'torneos']);
    expect(home(nav)).toBe('/staff/panel-entrenador');
  });

  it('Fisioterapeuta: clinical and competition only, Inicio on the clinical page', () => {
    const nav = staffNavFor(['USUARIO', 'FISIOTERAPEUTA']);
    expect(keys(nav)).toEqual(['inicio', 'clinico', 'competicion', 'torneos']);
    expect(home(nav)).toBe('/staff/clinico');
  });

  it('always includes an Inicio link, whatever the role', () => {
    for (const role of [
      'ADMINISTRADOR',
      'RECEPCION',
      'ENTRENADOR',
      'PSICOLOGO',
      'NEUROPSICOLOGO',
      'FISIOTERAPEUTA',
    ]) {
      expect(keys(staffNavFor([role]))[0]).toBe('inicio');
    }
  });
});

describe('splitForBottomBar', () => {
  it('puts 4 destinations in the phone bar and the rest under "Más"', () => {
    const { primary, more } = splitForBottomBar(staffNavFor(['ADMINISTRADOR']));
    expect(primary.map((i) => i.key)).toEqual(['inicio', 'cobros', 'entrenador', 'clinico']);
    expect(more).toHaveLength(9);
  });
});
