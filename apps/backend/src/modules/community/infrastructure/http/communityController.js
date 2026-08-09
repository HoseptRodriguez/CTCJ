import { REPORT_TARGET_TYPE } from '@ctcj/shared';

import { mapCommunityError } from './errorMapping.js';

function asyncHandler(fn) {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => next(mapCommunityError(err)));
  };
}

/** @param {ReturnType<import('../compositionRoot.js').buildCommunityContainer>} container */
export function createCommunityController(container) {
  const createPost = asyncHandler(async (req, res) => {
    const post = await container.createPost({
      authorUserId: req.user.id,
      content: req.body.content,
    });
    res.status(201).json(post);
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
