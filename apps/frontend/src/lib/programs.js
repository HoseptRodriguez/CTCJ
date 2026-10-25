/**
 * Content of the program pages (/programas/*). RULE: nothing about the club
 * is invented here (schedules, prices, ages, levels, coaches, results).
 * What the club hasn't given yet carries a COMPLETAR marker; the
 * production build fails while any is left (scripts/legal-check.mjs) and
 * they are listed in docs/LEGAL_PENDIENTES.md ("Contenido de programas").
 *
 * Photos: only ones without minors (src/lib/photo-rights.js). The children's
 * school uses a photo of the courts with no identifiable people.
 */

const faq = (program) =>
  [1, 2, 3].map((n) => ({
    question: `[COMPLETAR: pregunta frecuente ${n} sobre ${program}]`,
    answer: `[COMPLETAR: respuesta ${n}]`,
  }));

export const PROGRAMS = [
  {
    slug: 'adultos',
    infoProgram: 'ADULTOS',
    title: 'Clases para adultos',
    cardLabel: 'Clases para adultos',
    photo: 'jugador-desplazamiento',
    lead: 'Clases de tenis para adultos con la Academia Orlando Rodríguez.',
    forWhom: '[COMPLETAR: para quién es el programa de adultos (edades y niveles que recibe)]',
    includes: [
      '[COMPLETAR: qué incluye el programa de adultos (clases por semana, duración, materiales)]',
    ],
    schedule: '[COMPLETAR: días y horas de las clases para adultos]',
    price: '[COMPLETAR: valor del programa de adultos, o escribir "Consulta el valor"]',
    coaches: '[COMPLETAR: entrenadores del programa de adultos]',
    faq: faq('clases para adultos'),
  },
  {
    slug: 'escuela-infantil',
    infoProgram: 'ESCUELA_INFANTIL',
    title: 'Escuela infantil',
    cardLabel: 'Escuela infantil',
    photo: 'canchas-panoramica-nubes',
    lead: 'La escuela de tenis para niños y niñas de la Academia Orlando Rodríguez.',
    forWhom: '[COMPLETAR: edades y niveles de la escuela infantil]',
    includes: [
      '[COMPLETAR: qué incluye la escuela infantil (clases por semana, duración, materiales)]',
    ],
    schedule: '[COMPLETAR: días y horas de la escuela infantil]',
    price: '[COMPLETAR: valor de la escuela infantil, o escribir "Consulta el valor"]',
    coaches: '[COMPLETAR: entrenadores de la escuela infantil]',
    faq: faq('la escuela infantil'),
  },
  {
    slug: 'competencia',
    infoProgram: 'COMPETENCIA',
    title: 'Competencia y ranking',
    cardLabel: 'Competencia y ranking',
    photo: 'jugador-espera-recepcion',
    lead: 'Entrenamiento para competir, con el ranking interno y los torneos del club.',
    forWhom: '[COMPLETAR: para quién es el programa de competencia (edades, nivel mínimo)]',
    includes: [
      '[COMPLETAR: qué incluye el programa de competencia (entrenamientos, torneos, acompañamiento)]',
    ],
    schedule: '[COMPLETAR: días y horas del programa de competencia]',
    price: '[COMPLETAR: valor del programa de competencia, o escribir "Consulta el valor"]',
    coaches: '[COMPLETAR: entrenadores del programa de competencia]',
    faq: faq('el programa de competencia'),
  },
];

export const programBySlug = (slug) => PROGRAMS.find((p) => p.slug === slug) ?? null;
