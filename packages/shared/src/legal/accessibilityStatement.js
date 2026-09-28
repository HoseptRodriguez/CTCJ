import { BUSINESS } from './business.js';

/**
 * Declaración de accesibilidad. For the club, WCAG 2.1 AA is good practice,
 * not a legal obligation (Resolución 1519 de 2020 binds public entities).
 * The "limitations" list must reflect the real audit results (Parte 7,
 * docs/ACCESIBILIDAD.md): a new finding means a new version.
 */
export const ACCESSIBILITY_STATEMENT = Object.freeze({
  type: 'ACCESSIBILITY',
  path: '/accesibilidad',
  title: 'Declaración de accesibilidad',
  version: '2',
  publishedOn: '2026-09-28',
  sections: [
    {
      id: 'compromiso',
      heading: '1. Nuestro compromiso',
      blocks: [
        {
          p: 'Queremos que cualquier persona pueda usar este sitio, sin importar su edad, su visión, su audición o cómo navega. Buscamos cumplir las pautas WCAG 2.1 en su nivel AA.',
        },
      ],
    },
    {
      id: 'que-hicimos',
      heading: '2. Qué tiene el sitio',
      blocks: [
        {
          list: [
            'Botón "Letra grande" en todas las pantallas.',
            'Textos de 16 píxeles o más, y botones de al menos 44 píxeles de alto.',
            'Se puede usar con teclado y con lector de pantalla.',
            'Colores elegidos para tener buen contraste, y mensajes que no dependen solo del color.',
            'Sin reproducción automática de videos. Se respetan las preferencias de movimiento reducido del sistema.',
          ],
        },
      ],
    },
    {
      id: 'limitaciones',
      heading: '3. Limitaciones conocidas',
      blocks: [
        {
          list: [
            'Los videos que suben los jugadores a la Comunidad no tienen subtítulos ni transcripción.',
            'Las gráficas de rendimiento de Mi CTCJ pueden no leerse completas con lector de pantalla.',
            'En el teléfono, la tabla de horas para reservar se recorre con la tecla Tab; en computador también con las flechas.',
            'Revisamos las pantallas principales con herramientas automáticas, en computador y en teléfono, y corregimos lo que encontraron. Todavía falta una prueba con personas que usan lector de pantalla.',
          ],
        },
      ],
    },
    {
      id: 'reportar',
      heading: '4. Cómo reportar un problema',
      blocks: [
        {
          p: 'Si algo no te funciona, cuéntanos qué página, qué intentabas hacer y con qué dispositivo o lector de pantalla:',
        },
        {
          list: [
            `WhatsApp: ${BUSINESS.phone}.`,
            `Correo: ${BUSINESS.contactEmail}.`,
            'En persona, en la recepción del club.',
          ],
        },
        {
          p: 'Te responderemos en máximo [COMPLETAR: plazo de respuesta] días hábiles y, mientras lo resolvemos, te ayudaremos a hacer lo que necesitabas por otro medio.',
        },
      ],
    },
  ],
});
