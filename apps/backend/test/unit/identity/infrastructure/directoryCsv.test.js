import { describe, expect, it } from 'vitest';

import {
  csvCell,
  directoryCsv,
} from '../../../../src/modules/identity/infrastructure/http/staffDirectoryController.js';

describe('directory CSV', () => {
  it('neutralizes cells a spreadsheet would run as a formula', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('+573105551234')).toBe("'+573105551234");
    expect(csvCell('@ana')).toBe("'@ana");
    expect(csvCell('Gómez, Ana')).toBe('"Gómez, Ana"');
  });

  it('Spanish headers, BOM for Excel, readable values', () => {
    const csv = directoryCsv([
      {
        firstName: 'Ana',
        lastName: 'Gómez',
        email: 'ana@example.com',
        phone: '',
        isJugador: true,
        categories: ['TERCERA'],
        membershipStatus: null,
        dominantHand: 'LEFT',
        backhand: 'TWO_HANDED',
        isMinor: false,
        pendingGuardianAuthorization: false,
        active: true,
        lastLoginAt: null,
        createdAt: new Date('2026-09-01T12:00:00Z'),
      },
    ]);
    expect(csv.startsWith('﻿Nombre,Apellido,Correo,Celular,Jugador,Categoría')).toBe(true);
    expect(csv).toContain(
      'Ana,Gómez,ana@example.com,,Sí,TERCERA,Sin membresía,Zurdo,A dos manos,No,No,Activa,,2026-09-01',
    );
    expect(csv).not.toMatch(/documento|salud/i);
  });
});
