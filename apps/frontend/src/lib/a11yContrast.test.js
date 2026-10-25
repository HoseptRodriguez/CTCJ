import { describe, expect, it } from 'vitest';

import config from '../../tailwind.config.js';

/**
 * WCAG 2.1 AA color contrast (1.4.3 text, 1.4.11 non-text) for every color
 * pair the interface uses, including hover and focus states, translucent
 * text over navy and the diagonal brochure blocks. jsdom can't measure
 * contrast, so it's computed here from the real design tokens.
 * Minimums: 4.5 normal text, 3 large text (>= 24px, or 19px bold), 3 for
 * icons, field borders and focus indicators. Disabled controls are exempt.
 */
const C = config.theme.extend.colors;
const WHITE = '#FFFFFF';

function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** `fg` at `alpha` over the solid `bg` (e.g. text-white/85 on navy). */
function blend(fg, alpha, bg) {
  const [a, b] = [rgb(fg), rgb(bg)];
  const mix = a.map((v, i) => Math.round(v * alpha + b[i] * (1 - alpha)));
  return `#${mix.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function luminance(hex) {
  const [r, g, b] = rgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const TEXT = 4.5;
const LARGE = 3;
const NON_TEXT = 3;

// [what, foreground, background, minimum]
const PAIRS = [
  // Body text on the page, cards, skeleton tracks and notices
  ['texto principal / fondo', C.ink.DEFAULT, C.page, TEXT],
  ['texto principal / tarjeta', C.ink.DEFAULT, C.surface, TEXT],
  ['texto principal / aviso ámbar', C.ink.DEFAULT, C.amber.soft, TEXT],
  ['texto principal / verde lima', C.ink.DEFAULT, C.lime.DEFAULT, TEXT],
  ['texto secundario / fondo', C.ink.soft, C.page, TEXT],
  ['texto secundario / tarjeta', C.ink.soft, C.surface, TEXT],
  ['texto secundario / gris', C.ink.soft, C.muted, TEXT],
  ['texto secundario / aviso ámbar', C.ink.soft, C.amber.soft, TEXT],
  ['texto secundario / error suave', C.ink.soft, C.danger.soft, TEXT],
  ['marcador de posición / campo', C.ink.soft, C.surface, TEXT],
  // Navy text and links
  ['azul / tarjeta', C.navy[500], C.surface, TEXT],
  ['azul / fondo', C.navy[500], C.page, TEXT],
  ['azul / lima (botón principal)', C.navy[500], C.lime.DEFAULT, TEXT],
  ['azul / lima al pasar el mouse', C.navy[500], C.lime.hover, TEXT],
  ['azul / ámbar (contador)', C.navy[500], C.amber.DEFAULT, TEXT],
  ['azul / azul claro al pasar el mouse', C.navy[500], C.navy[50], TEXT],
  // White and lime on navy (header, footer, staff sidebar, diagonal blocks)
  ['blanco / azul', WHITE, C.navy[500], TEXT],
  ['blanco al 90 % / azul', blend(WHITE, 0.9, C.navy[500]), C.navy[500], TEXT],
  ['blanco al 85 % / azul', blend(WHITE, 0.85, C.navy[500]), C.navy[500], TEXT],
  ['blanco al 80 % / azul', blend(WHITE, 0.8, C.navy[500]), C.navy[500], TEXT],
  [
    'blanco / azul con fondo al pasar el mouse (blanco 10 %)',
    WHITE,
    blend(WHITE, 0.1, C.navy[500]),
    TEXT,
  ],
  ['lima / azul', C.lime.DEFAULT, C.navy[500], TEXT],
  // Hero: navy overlay at 80 % over a photo; worst case, a white pixel
  [
    'título del inicio / foto con capa azul (peor caso)',
    WHITE,
    blend(C.navy[500], 0.8, WHITE),
    LARGE,
  ],
  [
    'texto del inicio al 90 % / foto con capa azul (peor caso)',
    blend(WHITE, 0.9, blend(C.navy[500], 0.8, WHITE)),
    blend(C.navy[500], 0.8, WHITE),
    TEXT,
  ],
  // Clay block, danger buttons
  ['blanco / arcilla', WHITE, C.clay.DEFAULT, TEXT],
  ['arcilla oscura / fondo', C.clay.dark, C.page, TEXT],
  ['arcilla oscura / arcilla suave', C.clay.dark, C.clay.soft, TEXT],
  ['blanco / rojo (botón de peligro)', WHITE, C.danger.DEFAULT, TEXT],
  ['blanco / rojo al pasar el mouse', WHITE, C.danger.hover, TEXT],
  ['rojo / tarjeta (error)', C.danger.DEFAULT, C.surface, TEXT],
  ['rojo / error suave', C.danger.DEFAULT, C.danger.soft, TEXT],
  ['ámbar oscuro / aviso ámbar', C.amber.dark, C.amber.soft, TEXT],
  // Status badges (always with a text label)
  ['estado al día', C.status['ok-fg'], C.status['ok-bg'], TEXT],
  ['estado pendiente', C.status['pending-fg'], C.status['pending-bg'], TEXT],
  ['estado vencida', C.status['overdue-fg'], C.status['overdue-bg'], TEXT],
  ['estado suspendida', C.status['suspended-fg'], C.status['suspended-bg'], TEXT],
  // Non-text: field borders, focus ring, selection
  ['borde de campo / tarjeta', C.line.strong, C.surface, NON_TEXT],
  ['borde de campo / fondo', C.line.strong, C.page, NON_TEXT],
  ['borde de error / tarjeta', C.danger.DEFAULT, C.surface, NON_TEXT],
  ['anillo de foco (azul) / tarjeta', C.navy[500], C.surface, NON_TEXT],
  ['anillo de foco (lima) / azul', C.lime.DEFAULT, C.navy[500], NON_TEXT],
  ['casilla marcada (azul) / tarjeta', C.navy[500], C.surface, NON_TEXT],
  ['borde blanco / azul', WHITE, C.navy[500], NON_TEXT],
];

describe('color contrast (WCAG 2.1 AA)', () => {
  it.each(PAIRS)('%s', (_what, fg, bg, min) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(min);
  });

  it('the calculation matches known values', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrast(C.navy[500], WHITE)).toBeGreaterThan(16);
  });
});
