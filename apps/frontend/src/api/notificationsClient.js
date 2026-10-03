import { request, requestMultipart } from './httpClient.js';

export const notificationsClient = {
  /** @param {{limit?: number}} [params] @returns {Promise<{notifications: Array, unreadCount: number}>} */
  getMyNotifications: ({ limit } = {}) =>
    request('/api/notifications/me', { params: limit ? { limit } : undefined }),

  /** @param {string} notificationId */
  markNotificationRead: (notificationId) =>
    request(`/api/notifications/me/${notificationId}/read`, { method: 'POST' }),

  markAllNotificationsRead: () => request('/api/notifications/me/read-all', { method: 'POST' }),

  /** Mi CTCJ > Notificaciones */
  getPreferences: () => request('/api/notifications/me/preferences'),
  /** @param {{ categories?: object, dailyDigest?: boolean }} body */
  updatePreferences: (body) =>
    request('/api/notifications/me/preferences', { method: 'PUT', body }),

  /** Mi CTCJ > Novedades */
  listNews: () => request('/api/notifications/me/news'),

  /** "Dejar de recibir estos correos" (no session needed). */
  unsubscribe: (token) =>
    request('/api/notifications/unsubscribe', { method: 'POST', body: { token } }),
};

/** /staff/comunicados (Administración). */
export const announcementsClient = {
  list: () => request('/api/admin/announcements'),
  preview: (draft) => request('/api/admin/announcements/preview', { method: 'POST', body: draft }),
  create: (draft) => request('/api/admin/announcements', { method: 'POST', body: draft }),
  cancel: (id) => request(`/api/admin/announcements/${id}/cancel`, { method: 'POST' }),
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return requestMultipart('/api/admin/announcements/images', { formData });
  },
};
