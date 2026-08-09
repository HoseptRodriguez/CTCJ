import { createPostSchema, createCommentSchema, reportContentSchema } from '@ctcj/shared';

import { request } from './httpClient.js';

// request() puts every entry verbatim into the query string, including
// literal "undefined" for an unset key -- strip those before sending,
// matching competitionClient's definedParams precedent.
function definedParams(params) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined));
}

export const communityClient = {
  /** @param {{content: string}} payload */
  createPost: (payload) => {
    createPostSchema.parse(payload);
    return request('/api/community/posts', { method: 'POST', body: payload });
  },

  /** @param {{limit?: number, before?: string}} [params]
   * @returns {Promise<{posts: Array}>} */
  listPosts: (params = {}) => request('/api/community/posts', { params: definedParams(params) }),

  /** @param {string} postId */
  deletePost: (postId) => request(`/api/community/posts/${postId}`, { method: 'DELETE' }),

  /** @param {string} postId @returns {Promise<{comments: Array}>} */
  listComments: (postId) => request(`/api/community/posts/${postId}/comments`),

  /** @param {string} postId @param {{content: string}} payload */
  createComment: (postId, payload) => {
    createCommentSchema.parse(payload);
    return request(`/api/community/posts/${postId}/comments`, { method: 'POST', body: payload });
  },

  /** @param {string} commentId */
  deleteComment: (commentId) =>
    request(`/api/community/comments/${commentId}`, { method: 'DELETE' }),

  /** @param {string} postId */
  likePost: (postId) => request(`/api/community/posts/${postId}/like`, { method: 'POST' }),

  /** @param {string} postId */
  unlikePost: (postId) => request(`/api/community/posts/${postId}/like`, { method: 'DELETE' }),

  /** @param {string} postId @param {{reason?: string}} [payload] */
  reportPost: (postId, payload = {}) => {
    reportContentSchema.parse(payload);
    return request(`/api/community/posts/${postId}/report`, { method: 'POST', body: payload });
  },

  /** @param {string} commentId @param {{reason?: string}} [payload] */
  reportComment: (commentId, payload = {}) => {
    reportContentSchema.parse(payload);
    return request(`/api/community/comments/${commentId}/report`, {
      method: 'POST',
      body: payload,
    });
  },
};
