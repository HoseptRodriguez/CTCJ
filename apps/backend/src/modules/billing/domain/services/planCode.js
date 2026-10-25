/**
 * The plan code is generated once from its name and never changes (invoices
 * and reports refer to it): "Iniciación Niños" -> "INICIACION_NINOS".
 * Accents are dropped, anything else that isn't a letter or digit becomes a
 * single "_", max 40 characters. `taken` holds codes already in use; a
 * clash gets a numeric suffix ("_2", "_3"...).
 *
 * @param {string} name
 * @param {Set<string>} taken
 */
export function generatePlanCode(name, taken = new Set()) {
  const base =
    name
      .normalize('NFD')
      .replace(/\p{M}/gu, '') // combining accents
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40)
      .replace(/_+$/, '') || 'PLAN';
  if (!taken.has(base)) return base;
  for (let n = 2; ; n += 1) {
    const suffix = `_${n}`;
    const candidate = `${base.slice(0, 40 - suffix.length).replace(/_+$/, '')}${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
}
