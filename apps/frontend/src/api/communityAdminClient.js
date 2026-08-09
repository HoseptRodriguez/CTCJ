import { request } from './httpClient.js';

export const communityAdminClient = {
  /** @param {string} [status] defaults to PENDING server-side
   * @returns {Promise<{reports: Array}>} */
  listReports: (status) =>
    request('/api/admin/community/reports', { params: status ? { status } : undefined }),

  /** @param {string} reportId */
  dismissReport: (reportId) =>
    request(`/api/admin/community/reports/${reportId}/dismiss`, { method: 'POST' }),

  /** @param {string} postId */
  deletePost: (postId) => request(`/api/admin/community/posts/${postId}`, { method: 'DELETE' }),

  /** @param {string} commentId */
  deleteComment: (commentId) =>
    request(`/api/admin/community/comments/${commentId}`, { method: 'DELETE' }),
};
