import { createPostSchema, createCommentSchema, reportContentSchema } from '@ctcj/shared';

import { getAccessToken, request, requestMultipartWithProgress } from './httpClient.js';

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

  /** @returns {Promise<{canUploadMedia: boolean, isMinor: boolean, videoUpload: 'direct'|'server',
   *   remainingMediaPostsToday: number, limits: object}>} */
  getMediaCapabilities: () => request('/api/community/me/media-capabilities'),

  /**
   * A post with photos or a video (multipart), reporting upload progress.
   * @param {FormData} formData -- content, images[], or video + videoMeta + poster, or video (JSON ref)
   * @param {(percent: number) => void} [onProgress]
   */
  createMediaPost: (formData, onProgress) =>
    requestMultipartWithProgress('/api/community/posts', { formData, onProgress }),

  /**
   * Production: uploads the video straight from the browser to Vercel Blob
   * (the server only signs it), so 50 MB never go through our server.
   * @returns {Promise<{url: string}>}
   */
  uploadVideoDirect: async (file, { userId, durationSeconds, onProgress }) => {
    const { upload } = await import('@vercel/blob/client');
    const ext = file.type === 'video/webm' ? 'webm' : 'mp4';
    return upload(`community/${userId}/video.${ext}`, file, {
      access: 'public',
      handleUploadUrl: '/api/community/media/video-upload',
      headers: { Authorization: `Bearer ${getAccessToken()}` },
      clientPayload: JSON.stringify({
        contentType: file.type,
        sizeBytes: file.size,
        durationSeconds,
      }),
      contentType: file.type,
      onUploadProgress: ({ percentage }) => onProgress?.(Math.round(percentage)),
    });
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
