import { CONSENT_ACTION, DIRECTORY_PAGE_SIZE, ROLE_CODES } from '@ctcj/shared';

import { isMinorByBirthDate } from '../../domain/policies/age.js';
import { UserNotFound } from '../errors/UserNotFound.js';

/** Who sees the administrative data (membership, identity document, consents, guardians). */
const FRONT_DESK = [ROLE_CODES.ADMINISTRADOR, ROLE_CODES.RECEPCION];
const INACTIVE_STATUSES = new Set(['DEACTIVATED', 'SUSPENDED']);

const fold = (text) =>
  String(text ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
const digits = (text) => String(text ?? '').replace(/\D/g, '');

/**
 * The staff directory (/staff/jugadores) and a person's file. What each
 * member of the staff gets depends on their role, decided here (the routes
 * only let staff in): Administración and Recepción see membership, identity
 * document, consents and guardians; coaches see the sporting side only.
 * Health data never comes from here (the clinical module has its own rules).
 *
 * The club has hundreds of accounts, not millions: the list is read whole
 * and filtered in memory, which keeps derived filters (minor, pending
 * guardian authorization, category) simple and exact.
 *
 * @param {{
 *   userRepository: import('../ports/UserRepository.js').UserRepository,
 *   guardianshipRepository: import('../ports/GuardianshipRepository.js').GuardianshipRepository,
 *   consentRepository: import('../ports/ConsentRepository.js').ConsentRepository,
 *   playerCategoryProvider: import('../ports/PlayerCategoryProvider.js').PlayerCategoryProvider,
 *   isPendingGuardianAuthorization: (input: { userId: string }) => Promise<boolean>,
 *   clock: import('../ports/Clock.js').Clock,
 *   clubId: string,
 * }} deps
 */
export function createPlayerDirectoryUseCases({
  userRepository,
  guardianshipRepository,
  consentRepository,
  playerCategoryProvider,
  isPendingGuardianAuthorization,
  clock,
  clubId,
}) {
  const seesFrontDesk = (roles) => roles.some((r) => FRONT_DESK.includes(r));

  /** Every account with its derived fields, before filtering. */
  async function loadAll() {
    const now = clock.now();
    const rows = await userRepository.listForDirectory(clubId);
    const categories = await playerCategoryProvider
      .getCategories(rows.map((r) => r.id))
      .catch(() => new Map());
    return Promise.all(
      rows.map(async (r) => {
        // Same rule as checkIsMinor: by birth date, or the minor of an
        // approved guardianship; with neither, not a minor.
        const isMinor = r.birthDate
          ? isMinorByBirthDate(r.birthDate, now)
          : r.approvedGuardianIds.length > 0;
        return {
          ...r,
          isJugador: r.roleCodes.includes(ROLE_CODES.JUGADOR),
          isMinor,
          pendingGuardianAuthorization: isMinor
            ? await isPendingGuardianAuthorization({ userId: r.id })
            : false,
          categories: categories.get(r.id) ?? [],
          active: !INACTIVE_STATUSES.has(r.status) && !r.deletedAt,
        };
      }),
    );
  }

  function matches(row, { q, membership, category, minor, pendingGuardian, account }) {
    if (q) {
      const text = fold(q);
      const phone = digits(q);
      const byName = fold(`${row.firstName} ${row.lastName}`).includes(text);
      const byEmail = fold(row.email).includes(text);
      const byPhone = phone.length >= 3 && digits(row.phone).includes(phone);
      if (!byName && !byEmail && !byPhone) return false;
    }
    if (membership && (row.membershipStatus ?? 'NONE') !== membership) return false;
    if (category && !row.categories.includes(category)) return false;
    if (minor && !row.isMinor) return false;
    if (pendingGuardian && !row.pendingGuardianAuthorization) return false;
    if (account === 'active' && !row.active) return false;
    if (account === 'deactivated' && row.active) return false;
    return true;
  }

  function toListItem(row, frontDesk) {
    return {
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      phone: row.phone,
      avatarUrl: row.avatarUrl,
      categories: row.categories,
      dominantHand: row.dominantHand,
      lastLoginAt: row.lastLoginAt,
      isJugador: row.isJugador,
      isMinor: row.isMinor,
      pendingGuardianAuthorization: row.pendingGuardianAuthorization,
      active: row.active,
      // Money matters are the front desk's.
      ...(frontDesk ? { membershipStatus: row.membershipStatus } : {}),
    };
  }

  /** Coaches work with players; the front desk with every account. */
  const tabsFor = (roles) => (seesFrontDesk(roles) ? ['players', 'all'] : ['players']);

  async function filtered(viewerRoles, filters) {
    const all = await loadAll();
    const tab = tabsFor(viewerRoles).includes(filters.tab) ? filters.tab : 'players';
    const inTab = tab === 'players' ? all.filter((r) => r.isJugador) : all;
    return {
      all,
      tab,
      // Membership filter only for who can see memberships.
      rows: inTab.filter((r) =>
        matches(r, seesFrontDesk(viewerRoles) ? filters : { ...filters, membership: undefined }),
      ),
    };
  }

  return {
    /**
     * @param {{ viewerRoles: string[], tab?: string, q?: string, membership?: string,
     *   category?: string, minor?: string, pendingGuardian?: string, account?: string,
     *   page?: number }} input
     */
    async listDirectory({ viewerRoles, page = 1, ...filters }) {
      const { all, tab, rows } = await filtered(viewerRoles, filters);
      const frontDesk = seesFrontDesk(viewerRoles);
      const start = (page - 1) * DIRECTORY_PAGE_SIZE;
      return {
        tab,
        tabs: tabsFor(viewerRoles),
        totals: {
          players: all.filter((r) => r.isJugador).length,
          ...(frontDesk ? { users: all.length } : {}),
        },
        total: rows.length,
        page,
        pageSize: DIRECTORY_PAGE_SIZE,
        items: rows.slice(start, start + DIRECTORY_PAGE_SIZE).map((r) => toListItem(r, frontDesk)),
      };
    },

    /**
     * Rows of the CSV export (Administración): no health data and no
     * identity document, by design.
     */
    async exportDirectory({ viewerRoles, ...filters }) {
      const { tab, rows } = await filtered(viewerRoles, filters);
      return {
        tab,
        rows: rows.map((r) => ({
          firstName: r.firstName,
          lastName: r.lastName,
          email: r.email,
          phone: r.phone ?? '',
          isJugador: r.isJugador,
          categories: r.categories,
          membershipStatus: r.membershipStatus,
          dominantHand: r.dominantHand,
          backhand: r.backhand,
          isMinor: r.isMinor,
          pendingGuardianAuthorization: r.pendingGuardianAuthorization,
          active: r.active,
          lastLoginAt: r.lastLoginAt,
          createdAt: r.createdAt,
        })),
      };
    },

    /**
     * A person's file for the staff. Health data is not here: the "Salud"
     * tab asks the clinical module, with its own authorization rules.
     * @param {{ viewerRoles: string[], userId: string }} input
     */
    async getUserFile({ viewerRoles, userId }) {
      const all = await loadAll();
      const row = all.find((r) => r.id === userId);
      if (!row) throw new UserNotFound();
      const frontDesk = seesFrontDesk(viewerRoles);
      // Coaches only open players' files.
      if (!frontDesk && !row.isJugador) throw new UserNotFound();

      const base = {
        id: row.id,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        phone: row.phone,
        birthDate: row.birthDate,
        avatarUrl: row.avatarUrl,
        dominantHand: row.dominantHand,
        backhand: row.backhand,
        categories: row.categories,
        isJugador: row.isJugador,
        isMinor: row.isMinor,
        pendingGuardianAuthorization: row.pendingGuardianAuthorization,
        active: row.active,
        deleted: row.deletedAt != null,
        status: row.status,
        emailVerified: row.emailVerifiedAt != null,
        lastLoginAt: row.lastLoginAt,
        createdAt: row.createdAt,
        roles: row.roleCodes,
      };
      if (!frontDesk) return base;

      const byId = new Map(all.map((r) => [r.id, r]));
      const person = (id) => {
        const p = byId.get(id);
        return p
          ? { id: p.id, firstName: p.firstName, lastName: p.lastName, email: p.email }
          : null;
      };
      const [asGuardian, asMinor, consents] = await Promise.all([
        guardianshipRepository.listByGuardian(userId),
        guardianshipRepository.listByMinor(userId),
        consentRepository.listByUser(userId),
      ]);
      const link = (g, other) => ({
        id: g.id,
        status: g.status,
        canBook: g.canBook,
        canPay: g.canPay,
        person: person(other),
      });
      return {
        ...base,
        membershipStatus: row.membershipStatus,
        minors: asGuardian.map((g) => link(g, g.minorUserId)),
        guardians: asMinor.map((g) => link(g, g.guardianUserId)),
        consents: consents.map((c) => ({
          type: c.consentType,
          version: c.documentVersion,
          accepted: c.action === CONSENT_ACTION.ACCEPTED,
          at: c.createdAt,
          givenBy: c.givenBy && c.givenBy !== userId ? person(c.givenBy) : null,
          channels: c.details?.channels ?? undefined,
        })),
      };
    },
  };
}
