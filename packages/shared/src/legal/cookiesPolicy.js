/**
 * Política de cookies, from the real inventory (docs/LEGAL_INVENTARIO.md,
 * section b). Colombia has no specific cookie law; the SIC treats cookies
 * that identify people as personal data (Ley 1581 de 2012), so the
 * conservative criterion applies: inform every one, and ask before using any
 * that is not strictly necessary.
 */
export const COOKIE_CATEGORY = Object.freeze({
  NECESSARY: 'NECESSARY',
  PREFERENCES: 'PREFERENCES',
  ANALYTICS: 'ANALYTICS',
});

/** What the site stores in the browser. Keep in sync with the code (Parte 4 reads this list). */
export const COOKIE_INVENTORY = Object.freeze([
  {
    name: 'ctcj_refresh',
    kind: 'Cookie',
    category: COOKIE_CATEGORY.NECESSARY,
    purpose: 'Mantener tu sesión iniciada de forma segura. No se puede leer desde la página.',
    duration: '30 días (se renueva al usarla); se borra al cerrar sesión',
    owner: 'Propia',
  },
  {
    name: 'ctcj:cookie-consent',
    kind: 'Almacenamiento local (localStorage)',
    category: COOKIE_CATEGORY.NECESSARY,
    purpose: 'Recordar qué cookies aceptaste, con la fecha y la versión de esta política.',
    duration: 'Hasta que la borres o cambie esta política',
    owner: 'Propia',
  },
  {
    name: 'ctcj:font-scale',
    kind: 'Almacenamiento local (localStorage)',
    category: COOKIE_CATEGORY.PREFERENCES,
    purpose: 'Recordar si elegiste "Letra grande".',
    duration: 'Hasta que la borres o retires el consentimiento',
    owner: 'Propia',
  },
]);

export const COOKIES_POLICY = Object.freeze({
  type: 'COOKIES',
  path: '/cookies',
  title: 'Política de cookies',
  version: '1',
  publishedOn: '2026-09-28',
  sections: [
    {
      id: 'que-son',
      heading: '1. Qué son',
      blocks: [
        {
          p: 'Las cookies y el almacenamiento local son pequeños datos que el sitio guarda en tu navegador. Aquí están todos los que usamos.',
        },
      ],
    },
    {
      id: 'categorias',
      heading: '2. Categorías',
      blocks: [
        {
          list: [
            'Necesarias: sin ellas el sitio no funciona (sesión, seguridad y tu decisión sobre las cookies). Están siempre activas, pero te las informamos.',
            'Preferencias: recuerdan opciones como "Letra grande". Solo se guardan si las aceptas.',
            'Analítica: medir el uso del sitio. Hoy no usamos ninguna. Si algún día se usan, estarán desactivadas por defecto y te pediremos permiso.',
          ],
        },
      ],
    },
    {
      id: 'lista',
      heading: '3. Lista completa',
      blocks: [
        {
          table: {
            head: ['Nombre', 'Tipo', 'Categoría', 'Para qué', 'Duración', 'De quién'],
            rows: COOKIE_INVENTORY.map((c) => [
              c.name,
              c.kind,
              { NECESSARY: 'Necesaria', PREFERENCES: 'Preferencias', ANALYTICS: 'Analítica' }[
                c.category
              ],
              c.purpose,
              c.duration,
              c.owner,
            ]),
          },
        },
        {
          p: 'No usamos cookies de terceros, ni publicidad, ni seguimiento. Las tipografías se sirven desde este mismo sitio.',
        },
      ],
    },
    {
      id: 'decidir',
      heading: '4. Cómo decidir',
      blocks: [
        {
          p: 'En tu primera visita te preguntamos qué aceptas. Puedes cambiar tu decisión cuando quieras con "Configurar cookies", en el pie de página o en esta misma página. También puedes borrarlas desde la configuración de tu navegador; si borras las necesarias, se cerrará tu sesión.',
        },
      ],
    },
  ],
});
