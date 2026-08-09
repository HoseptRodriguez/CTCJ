import { REPORT_TARGET_TYPE, REPORT_STATUS } from '@ctcj/shared';

/**
 * Staff-only. Joins each report with a snippet of its target's content and
 * author, plus the reporter's name, so staff can judge without a second
 * round-trip -- mirrors affiliationAdminController's list/decide queue
 * shape, just for content instead of requests.
 *
 * @param {{
 *   reportRepository: import('../ports/ReportRepository.js').ReportRepository,
 *   postRepository: import('../ports/PostRepository.js').PostRepository,
 *   commentRepository: import('../ports/CommentRepository.js').CommentRepository,
 *   playerDirectoryProvider: import('../ports/PlayerDirectoryProvider.js').PlayerDirectoryProvider,
 * }} deps
 */
export function createListReportedContent({
  reportRepository,
  postRepository,
  commentRepository,
  playerDirectoryProvider,
}) {
  /** @param {{ status?: string }} [input] */
  return async function listReportedContent({ status = REPORT_STATUS.PENDING } = {}) {
    const reports = await reportRepository.listByStatus(status);
    if (reports.length === 0) {
      return { reports: [] };
    }

    const postIds = reports
      .filter((r) => r.targetType === REPORT_TARGET_TYPE.POST)
      .map((r) => r.targetId);
    const commentIds = reports
      .filter((r) => r.targetType === REPORT_TARGET_TYPE.COMMENT)
      .map((r) => r.targetId);

    const [posts, comments] = await Promise.all([
      Promise.all(postIds.map((id) => postRepository.findById(id))),
      Promise.all(commentIds.map((id) => commentRepository.findById(id))),
    ]);
    const postsById = new Map(posts.filter(Boolean).map((p) => [p.id, p]));
    const commentsById = new Map(comments.filter(Boolean).map((c) => [c.id, c]));

    const targets = [...postsById.values(), ...commentsById.values()];
    const nameIds = [
      ...new Set([...targets.map((t) => t.authorId), ...reports.map((r) => r.reporterId)]),
    ];
    const summaries = await playerDirectoryProvider.getPlayerSummaries(nameIds);

    const enriched = reports.map((r) => {
      const target =
        r.targetType === REPORT_TARGET_TYPE.POST
          ? postsById.get(r.targetId)
          : commentsById.get(r.targetId);
      const targetAuthor = target ? summaries.get(target.authorId) : null;
      const reporter = summaries.get(r.reporterId);
      return {
        ...r,
        // null if the target was already removed through some other path
        // (e.g. its author deleted it after the report was filed) -- the
        // report itself still shows up until staff dismiss it.
        targetContent: target?.content ?? null,
        targetAuthor: targetAuthor
          ? {
              id: target.authorId,
              firstName: targetAuthor.firstName,
              lastName: targetAuthor.lastName,
            }
          : null,
        reporter: reporter
          ? { id: r.reporterId, firstName: reporter.firstName, lastName: reporter.lastName }
          : null,
      };
    });

    return { reports: enriched };
  };
}
