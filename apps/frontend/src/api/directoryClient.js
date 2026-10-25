import { downloadFile, request } from './httpClient.js';

const clean = (params) =>
  Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== ''));

/** Staff directory of players and accounts (/staff/jugadores). */
export const directoryClient = {
  /**
   * @param {{ tab?: string, q?: string, membership?: string, category?: string,
   *   minor?: string, pendingGuardian?: string, account?: string, page?: number }} params
   */
  list: (params) => request('/api/admin/directory', { params: clean(params) }),

  /** CSV of the current filters (Administración). */
  exportCsv: (params) =>
    downloadFile('/api/admin/directory/export.csv', {
      params: clean({ ...params, page: undefined }),
      fallbackName: 'jugadores-ctcj.csv',
    }),

  getFile: (userId) => request(`/api/admin/directory/${userId}`),
  grantPlayerRole: (userId) =>
    request(`/api/admin/directory/${userId}/player-role`, { method: 'POST' }),
  revokePlayerRole: (userId) =>
    request(`/api/admin/directory/${userId}/player-role`, { method: 'DELETE' }),
  /** Roles del personal (Administración): give or take one staff role. */
  setStaffRole: (userId, roleCode, grant) =>
    request(`/api/admin/directory/${userId}/roles/${roleCode}`, {
      method: grant ? 'POST' : 'DELETE',
    }),
  deactivate: (userId) => request(`/api/admin/directory/${userId}/deactivate`, { method: 'POST' }),
  reactivate: (userId) => request(`/api/admin/directory/${userId}/reactivate`, { method: 'POST' }),
  resetMfa: (userId) => request(`/api/admin/directory/${userId}/mfa-reset`, { method: 'POST' }),
  resendVerification: (userId) =>
    request(`/api/admin/directory/${userId}/resend-verification`, { method: 'POST' }),

  // The player's file, from the other modules.
  getPlayerReservations: (userId) => request(`/api/booking/players/${userId}/reservations`),
  getPlayerCompetition: (userId) => request(`/api/competition/players/${userId}/summary`),
  getPlayerTournaments: (userId) => request(`/api/tournaments/players/${userId}`),
};
