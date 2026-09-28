import axe from 'axe-core';

/**
 * Runs axe-core (WCAG 2.0/2.1 A and AA rules) over what's rendered and
 * returns the serious and critical violations as readable lines, so a test
 * can `expect(await a11yViolations()).toEqual([])` and show what failed.
 *
 * Color contrast can't be measured in jsdom (no layout or computed colors);
 * it's checked separately against the design tokens (a11yContrast.test.js)
 * and in the browser audits (docs/ACCESIBILIDAD.md).
 *
 * @param {Element|Document} [context]
 */
export async function a11yViolations(context = document) {
  const results = await axe.run(context, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
}
