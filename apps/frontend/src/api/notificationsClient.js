import { request } from './httpClient.js';

export const notificationsClient = {
  /** @param {{limit?: number}} [params] @returns {Promise<{notifications: Array, unreadCount: number}>} */
  getMyNotifications: ({ limit } = {}) =>
    request('/api/notifications/me', { params: limit ? { limit } : undefined }),

  /** @param {string} notificationId */
  markNotificationRead: (notificationId) =>
    request(`/api/notifications/me/${notificationId}/read`, { method: 'POST' }),

  markAllNotificationsRead: () => request('/api/notifications/me/read-all', { method: 'POST' }),
};
