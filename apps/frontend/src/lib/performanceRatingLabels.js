/** Spanish label per skill area (Phase 11's performance ratings, expanded
 * for the dashboards phase with SLICE/FOOTWORK/FITNESS/MENTALITY). */
export const AREA_LABELS = {
  FOREHAND: 'Derecha',
  BACKHAND: 'Revés',
  SERVE: 'Saque',
  RETURN: 'Resto',
  VOLLEY: 'Volea',
  OVERHEAD: 'Remate',
  SLICE: 'Slice',
  FOOTWORK: 'Juego de pies',
  FITNESS: 'Condición física',
  MENTALITY: 'Mentalidad',
};

export function describeArea(area) {
  return AREA_LABELS[area] ?? area;
}

/**
 * Qualitative band for a 1-10 rating -- shown on the PLAYER's own view
 * instead of a bare number, which reads as a blunt report card rather than
 * "professional" (staff sees the raw number, they need the precision).
 */
const RATING_BANDS = [
  { min: 9, label: 'Excelente' },
  { min: 7, label: 'Muy bueno' },
  { min: 5, label: 'Bueno' },
  { min: 3, label: 'En desarrollo' },
  { min: 1, label: 'Necesita trabajo' },
];

export function describeRatingBand(rating) {
  const band = RATING_BANDS.find((b) => rating >= b.min);
  return band?.label ?? '—';
}
