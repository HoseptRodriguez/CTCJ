/**
 * "Descargar mis datos": everything the club keeps about the person, as
 * JSON (right of access, Ley 1581 de 2012, art. 8).
 *
 * @param {{
 *   personalDataExporter: import('../ports/PersonalDataExporter.js').PersonalDataExporter,
 *   clock: import('../ports/Clock.js').Clock,
 * }} deps
 */
export function createExportMyData({ personalDataExporter, clock }) {
  /** @param {{ userId: string }} input */
  return async function exportMyData({ userId }) {
    return {
      generatedAt: clock.now().toISOString(),
      notice:
        'Estos son los datos personales que el club guarda sobre ti. Si algo está mal, puedes pedir que lo corrijamos desde «Mis datos y privacidad».',
      data: await personalDataExporter.exportFor(userId),
    };
  };
}
