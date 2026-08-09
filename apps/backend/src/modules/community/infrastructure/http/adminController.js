import { REPORT_TARGET_TYPE } from '@ctcj/shared';

import { mapCommunityError } from './errorMapping.js';

function asyncHandler(fn) {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => next(mapCommunityError(err)));
  };
}

/** @param {ReturnType<import('../compositionRoot.js').buildCommunityContainer>} container */
export function createAdminController(container) {
  const listReports = asyncHandler(async (req, res) => {
    const result = await container.listReportedContent({ status: req.query.status });
    res.status(200).json(result);
  });

  const dismissReport = asyncHandler(async (req, res) => {
    const report = await container.dismissReport({
      reportId: req.params.id,
      staffUserId: req.user.id,
    });
    res.status(200).json(report);
  });

  const deletePost = asyncHandler(async (req, res) => {
    await container.deleteContentAsStaff({
      targetType: REPORT_TARGET_TYPE.POST,
      targetId: req.params.id,
    });
    res.status(204).send();
  });

  const deleteComment = asyncHandler(async (req, res) => {
    await container.deleteContentAsStaff({
      targetType: REPORT_TARGET_TYPE.COMMENT,
      targetId: req.params.id,
    });
    res.status(204).send();
  });

  return { listReports, dismissReport, deletePost, deleteComment };
}
