import { handleUpload } from '@vercel/blob/client';
import {
  createMediaPostFieldsSchema,
  REPORT_TARGET_TYPE,
  videoUploadRequestSchema,
} from '@ctcj/shared';

import { HttpError } from '../../../../shared/errors/httpError.js';

import { mapCommunityError } from './errorMapping.js';

function asyncHandler(fn) {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => next(mapCommunityError(err)));
  };
}

function parseJson(text) {
  try {
    return text ? JSON.parse(text) : undefined;
  } catch {
    throw new HttpError(400, 'validation_error', 'Invalid JSON field.');
  }
}

/**
 * @param {ReturnType<import('../compositionRoot.js').buildCommunityContainer>} container
 * @param {{ blobToken?: string }} [options] -- set when videos upload straight to Vercel Blob
 */
export function createCommunityController(container, { blobToken } = {}) {
  const createPost = asyncHandler(async (req, res) => {
    const post = await container.createPost({
      authorUserId: req.user.id,
      content: req.body.content,
    });
    res.status(201).json(post);
  });

  const createMediaPost = asyncHandler(async (req, res) => {
    const parsed = createMediaPostFieldsSchema.safeParse({
      content: req.body.content ?? '',
      video: parseJson(req.body.video),
    });
    if (!parsed.success) {
      throw new HttpError(400, 'validation_error', 'Invalid post fields.');
    }
    const files = req.files ?? {};
    const toInput = (f) => ({ buffer: f.buffer, sizeBytes: f.size });
    const videoFile = files.video?.[0];
    const videoMeta = parseJson(req.body.videoMeta) ?? {};
    let video = parsed.data.video ?? null;
    if (videoFile) {
      video = {
        ...toInput(videoFile),
        durationSeconds: Number(videoMeta.durationSeconds) || null,
        width: Number(videoMeta.width) || undefined,
        height: Number(videoMeta.height) || undefined,
      };
    }
    const post = await container.createPost({
      authorUserId: req.user.id,
      content: parsed.data.content,
      images: (files.images ?? []).map(toInput),
      video,
      poster: files.poster?.[0] ? toInput(files.poster[0]) : null,
    });
    res.status(201).json(post);
  });

  const getMediaCapabilities = asyncHandler(async (req, res) => {
    res.status(200).json(await container.getMediaCapabilities({ userId: req.user.id }));
  });

  // Vercel Blob client upload: the browser asks for a token here, then
  // uploads straight to Blob. We check who, what and how big BEFORE signing.
  const videoUpload = asyncHandler(async (req, res) => {
    if (!blobToken) {
      throw new HttpError(
        409,
        'video_upload_unavailable',
        'Direct video uploads are not available.',
      );
    }
    const result = await handleUpload({
      body: req.body,
      request: req,
      token: blobToken,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const parsed = videoUploadRequestSchema.safeParse(parseJson(clientPayload) ?? {});
        if (!parsed.success) {
          throw new HttpError(400, 'media_unsupported_type', 'Invalid video description.');
        }
        const options = await container.authorizeVideoUpload({
          userId: req.user.id,
          pathname,
          request: parsed.data,
        });
        return { ...options, tokenPayload: JSON.stringify({ userId: req.user.id }) };
      },
    });
    res.status(200).json(result);
  });

  const listPosts = asyncHandler(async (req, res) => {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const before = req.query.before ? new Date(req.query.before) : undefined;
    const result = await container.listPosts({ callerUserId: req.user.id, limit, before });
    res.status(200).json(result);
  });

  const deleteMyPost = asyncHandler(async (req, res) => {
    await container.deleteMyPost({ userId: req.user.id, postId: req.params.id });
    res.status(204).send();
  });

  const createComment = asyncHandler(async (req, res) => {
    const comment = await container.createComment({
      postId: req.params.id,
      authorUserId: req.user.id,
      content: req.body.content,
    });
    res.status(201).json(comment);
  });

  const listComments = asyncHandler(async (req, res) => {
    const result = await container.listComments({ postId: req.params.id });
    res.status(200).json(result);
  });

  const deleteMyComment = asyncHandler(async (req, res) => {
    await container.deleteMyComment({ userId: req.user.id, commentId: req.params.id });
    res.status(204).send();
  });

  const likePost = asyncHandler(async (req, res) => {
    await container.likePost({ userId: req.user.id, postId: req.params.id });
    res.status(204).send();
  });

  const unlikePost = asyncHandler(async (req, res) => {
    await container.unlikePost({ userId: req.user.id, postId: req.params.id });
    res.status(204).send();
  });

  const reportPost = asyncHandler(async (req, res) => {
    const report = await container.reportContent({
      reporterUserId: req.user.id,
      targetType: REPORT_TARGET_TYPE.POST,
      targetId: req.params.id,
      reason: req.body.reason,
    });
    res.status(201).json(report);
  });

  const reportComment = asyncHandler(async (req, res) => {
    const report = await container.reportContent({
      reporterUserId: req.user.id,
      targetType: REPORT_TARGET_TYPE.COMMENT,
      targetId: req.params.id,
      reason: req.body.reason,
    });
    res.status(201).json(report);
  });

  return {
    createPost,
    createMediaPost,
    getMediaCapabilities,
    videoUpload,
    listPosts,
    deleteMyPost,
    createComment,
    listComments,
    deleteMyComment,
    likePost,
    unlikePost,
    reportPost,
    reportComment,
  };
}
