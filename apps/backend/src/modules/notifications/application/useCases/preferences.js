import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CHANNELS,
  PROMOTIONAL_CATEGORIES,
  SERVICE_PREFERENCE_CATEGORIES,
} from '@ctcj/shared';

/**
 * Mi CTCJ > Notificaciones. Service switches live here (a missing row =
 * on); promotional switches are the MARKETING consent, read and written
 * through identity (MarketingGateway), so the proof of each change stays in
 * `consents`.
 *
 * @param {{
 *   preferenceRepository: import('../ports/NotificationPreferenceRepository.js').NotificationPreferenceRepository,
 *   marketingGateway: import('../ports/MarketingGateway.js').MarketingGateway,
 * }} deps
 */
export function createPreferenceUseCases({ preferenceRepository, marketingGateway }) {
  async function view(userId) {
    const [prefs, settings, marketing] = await Promise.all([
      preferenceRepository.listForUser(userId),
      preferenceRepository.getSettings(userId),
      marketingGateway.getMarketingPreferences({ userId }),
    ]);
    const enabled = (category, channel) =>
      !prefs.some((p) => p.category === category && p.channel === channel && !p.enabled);
    const categories = [...SERVICE_PREFERENCE_CATEGORIES, ...PROMOTIONAL_CATEGORIES].map((id) => {
      const meta = NOTIFICATION_CATEGORIES[id];
      const promotional = meta.kind === 'PROMOTIONAL';
      return {
        id,
        kind: meta.kind,
        label: meta.label,
        description: meta.description,
        channels: {
          APP: promotional ? marketing.matrix[id].APP : enabled(id, 'APP'),
          EMAIL: promotional ? marketing.matrix[id].EMAIL : enabled(id, 'EMAIL'),
          PUSH: promotional ? false : enabled(id, 'PUSH'),
        },
      };
    });
    return {
      categories,
      channels: NOTIFICATION_CHANNELS,
      dailyDigest: settings.dailyDigest,
      isMinor: marketing.isMinor,
      // A minor's promotional messages are the guardian's decision.
      promotionalLocked: marketing.isMinor,
    };
  }

  return {
    /** @param {{ userId: string }} input */
    getMyNotificationPreferences: ({ userId }) => view(userId),

    /**
     * @param {{ userId: string,
     *   categories?: Record<string, { APP?: boolean, EMAIL?: boolean, PUSH?: boolean }>,
     *   dailyDigest?: boolean, ipAddress?: string|null, userAgent?: string|null }} input
     */
    async updateMyNotificationPreferences({
      userId,
      categories = {},
      dailyDigest,
      ipAddress = null,
      userAgent = null,
    }) {
      const rows = [];
      for (const category of SERVICE_PREFERENCE_CATEGORIES) {
        for (const channel of ['APP', 'EMAIL', 'PUSH']) {
          const value = categories[category]?.[channel];
          if (typeof value === 'boolean') rows.push({ category, channel, enabled: value });
        }
      }
      if (rows.length) await preferenceRepository.upsertMany(userId, rows);
      if (typeof dailyDigest === 'boolean') {
        await preferenceRepository.setSettings(userId, { dailyDigest });
      }
      const promotional = PROMOTIONAL_CATEGORIES.filter((c) => categories[c]);
      if (promotional.length) {
        const current = await marketingGateway.getMarketingPreferences({ userId });
        const matrix = { ...current.matrix };
        for (const c of promotional) {
          matrix[c] = {
            APP: categories[c].APP ?? matrix[c].APP,
            EMAIL: categories[c].EMAIL ?? matrix[c].EMAIL,
          };
        }
        const changed = promotional.some(
          (c) =>
            matrix[c].APP !== current.matrix[c].APP || matrix[c].EMAIL !== current.matrix[c].EMAIL,
        );
        if (changed) {
          await marketingGateway.setMarketingPreferences({ userId, matrix, ipAddress, userAgent });
        }
      }
      return view(userId);
    },

    /**
     * "Dejar de recibir estos correos" (one click, from a signed link):
     * promotional -> out of the consent; service -> that email switch off.
     * @param {{ userId: string, category: string }} input
     */
    async stopEmails({ userId, category }) {
      if (PROMOTIONAL_CATEGORIES.includes(category)) {
        await marketingGateway.stopMarketingEmails({ userId, category });
      } else if (SERVICE_PREFERENCE_CATEGORIES.includes(category)) {
        await preferenceRepository.upsertMany(userId, [
          { category, channel: 'EMAIL', enabled: false },
        ]);
      } else {
        return { category, changed: false };
      }
      return { category, label: NOTIFICATION_CATEGORIES[category].label, changed: true };
    },
  };
}
