import { describe, expect, it } from 'vitest';

import { collectLegalProblems, findMarkers } from '../../../../../scripts/legal-check.mjs';

describe('npm run legal:check', () => {
  it('finds every [COMPLETAR] and [VERIFICAR] marker, with or without a description', () => {
    expect(
      findMarkers('Razón social: [COMPLETAR: razón social]. Plazo [VERIFICAR]. [Otro] texto'),
    ).toEqual(['[COMPLETAR: razón social]', '[VERIFICAR]']);
  });

  it('blocks on legal pages, business data and the footer; passes when all is complete', () => {
    const problems = collectLegalProblems({
      documents: [
        {
          type: 'TERMS',
          title: 'Términos',
          path: '/terminos',
          sections: [{ p: 'NIT [COMPLETAR: NIT]' }],
        },
        { type: 'COOKIES', title: 'Cookies', path: '/cookies', sections: [{ p: 'Todo listo.' }] },
      ],
      business: { legalName: 'Club S.A.S.', nit: '[COMPLETAR: NIT]' },
      footerSources: [{ file: 'Footer.jsx', text: '<p>[VERIFICAR horario]</p>' }],
    });
    expect(problems.map((p) => p.where)).toEqual([
      'Términos (/terminos)',
      'Datos del negocio del pie de página (packages/shared/src/legal/business.js)',
      'Pie de página (Footer.jsx)',
    ]);
    expect(problems[1].markers).toEqual(['nit: [COMPLETAR: NIT]']);

    expect(
      collectLegalProblems({
        documents: [{ type: 'COOKIES', title: 'Cookies', sections: [{ p: 'Listo.' }] }],
        business: { legalName: 'Club S.A.S.' },
        footerSources: [{ file: 'Footer.jsx', text: '<p>Hola</p>' }],
      }),
    ).toEqual([]);
  });
});
