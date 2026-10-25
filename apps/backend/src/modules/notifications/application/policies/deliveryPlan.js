import { NOTIFICATION_CATEGORIES } from '@ctcj/shared';

/**
 * Decides, for one person and one notification, which channels it goes
 * through and to which email addresses. Pure: all data comes in.
 *
 * - Not switchable (reservas, facturas, membresía; retos in the app): always.
 * - Service categories: on unless the person turned that channel off.
 * - Promotional categories: ONLY if the MARKETING consent includes that
 *   category and channel (off by default, Ley 2300 de 2023).
 * - Emails of a minor go to their approved guardians, never to the minor
 *   (Ley 1581 de 2012, art. 7). No guardian = no email.
 * - Challenges and the Community (ACTIVITY) are in-app only.
 *
 * @param {{
 *   category: string,
 *   contact: { id: string, email: string|null, firstName: string, isMinor: boolean,
 *     guardians: Array<{ id: string, email: string, firstName: string }> },
 *   servicePreferences?: Array<{ category: string, channel: string, enabled: boolean }>,
 *   marketingMatrix?: Record<string, { APP: boolean, EMAIL: boolean }>,
 * }} input
 * @returns {{ app: boolean, email: boolean,
 *   emailTargets: Array<{ userId: string, email: string, firstName: string, isGuardian: boolean }> }}
 */
export function planDelivery({ category, contact, servicePreferences = [], marketingMatrix = {} }) {
  const meta = NOTIFICATION_CATEGORIES[category];
  if (!meta) throw new Error(`Unknown notification category: ${category}`);

  let app;
  let email;
  if (category === 'ACTIVITY') {
    app = true;
    email = false;
  } else if (!meta.switchable) {
    app = true;
    email = true;
  } else if (meta.kind === 'PROMOTIONAL') {
    app = marketingMatrix[category]?.APP === true;
    email = marketingMatrix[category]?.EMAIL === true;
  } else {
    const off = (channel) =>
      servicePreferences.some(
        (p) => p.category === category && p.channel === channel && p.enabled === false,
      );
    app = !off('APP');
    email = !off('EMAIL');
  }

  let emailTargets = [];
  if (email) {
    emailTargets = contact.isMinor
      ? contact.guardians.map((g) => ({
          userId: g.id,
          email: g.email,
          firstName: g.firstName,
          isGuardian: true,
        }))
      : contact.email
        ? [
            {
              userId: contact.id,
              email: contact.email,
              firstName: contact.firstName,
              isGuardian: false,
            },
          ]
        : [];
  }
  return { app, email: emailTargets.length > 0, emailTargets };
}
