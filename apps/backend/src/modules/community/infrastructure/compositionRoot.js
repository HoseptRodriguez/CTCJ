import { prisma } from '../../../shared/prismaClient.js';
import { systemClock } from '../application/ports/Clock.js';
import { createCreatePost } from '../application/useCases/createPost.js';
import { createListPosts } from '../application/useCases/listPosts.js';
import { createDeleteMyPost } from '../application/useCases/deleteMyPost.js';
import { createCreateComment } from '../application/useCases/createComment.js';
import { createListComments } from '../application/useCases/listComments.js';
import { createDeleteMyComment } from '../application/useCases/deleteMyComment.js';
import { createLikePost } from '../application/useCases/likePost.js';
import { createUnlikePost } from '../application/useCases/unlikePost.js';
import { createReportContent } from '../application/useCases/reportContent.js';
import { createListReportedContent } from '../application/useCases/listReportedContent.js';
import { createDismissReport } from '../application/useCases/dismissReport.js';
import { createDeleteContentAsStaff } from '../application/useCases/deleteContentAsStaff.js';

import { createPrismaPostRepository } from './persistence/prismaPostRepository.js';
import { createPrismaCommentRepository } from './persistence/prismaCommentRepository.js';
import { createPrismaPostLikeRepository } from './persistence/prismaPostLikeRepository.js';
import { createPrismaReportRepository } from './persistence/prismaReportRepository.js';
import {
  createNullPlayerEligibilityProvider,
  createNullPlayerDirectoryProvider,
  createNullNotificationSender,
} from './adapters/nullAdapters.js';

/**
 * Wires concrete infrastructure adapters to application use cases. Mirrors
 * challenges'/goals' compositionRoot.js exactly for consistency.
 *
 * `playerEligibilityProvider`/`playerDirectoryProvider`/`notificationSender`
 * are optional, cross-module dependencies -- app.js supplies the real ones,
 * wired to identity's and notifications' application layers. Unlike
 * challenges' MatchRecorder, none of these need a build-then-patch step:
 * identity and notifications are both already built by the time app.js
 * builds community. Left unset (e.g. in a standalone/test call), each
 * defaults to a null-object adapter matching every other cross-module
 * port's documented fail-open/fail-closed default.
 */
export function buildCommunityContainer({
  prismaClient = prisma,
  playerEligibilityProvider = createNullPlayerEligibilityProvider(),
  playerDirectoryProvider = createNullPlayerDirectoryProvider(),
  notificationSender = createNullNotificationSender(),
} = {}) {
  const postRepository = createPrismaPostRepository(prismaClient);
  const commentRepository = createPrismaCommentRepository(prismaClient);
  const postLikeRepository = createPrismaPostLikeRepository(prismaClient);
  const reportRepository = createPrismaReportRepository(prismaClient);
  const clock = systemClock;

  return {
    createPost: createCreatePost({ postRepository, playerEligibilityProvider, clock }),
    listPosts: createListPosts({ postRepository, postLikeRepository, playerDirectoryProvider }),
    deleteMyPost: createDeleteMyPost({ postRepository }),
    createComment: createCreateComment({
      postRepository,
      commentRepository,
      playerEligibilityProvider,
      playerDirectoryProvider,
      notificationSender,
      clock,
    }),
    listComments: createListComments({ commentRepository, playerDirectoryProvider }),
    deleteMyComment: createDeleteMyComment({ commentRepository }),
    likePost: createLikePost({ postRepository, postLikeRepository, clock }),
    unlikePost: createUnlikePost({ postLikeRepository }),
    reportContent: createReportContent({
      postRepository,
      commentRepository,
      reportRepository,
      playerEligibilityProvider,
      clock,
    }),
    listReportedContent: createListReportedContent({
      reportRepository,
      postRepository,
      commentRepository,
      playerDirectoryProvider,
    }),
    dismissReport: createDismissReport({ reportRepository, clock }),
    deleteContentAsStaff: createDeleteContentAsStaff({ postRepository, commentRepository }),
  };
}
