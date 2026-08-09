-- Community: Posts, Comments, Likes (Phase 3c) ----------------------------
-- The first genuinely open user-generated-content surface in this app --
-- unlike every other module, moderated content is HARD deleted (not voided
-- like competition_matches, not status-transitioned like challenges): if a
-- post needs to come down, the content itself is the problem, so it should
-- actually go away rather than linger with a "removed" badge still showing
-- the offending text. A deliberate, one-time precedent deviation.

-- CommunityPost ---------------------------------------------------------
CREATE TABLE "community_posts" (
    "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
    "author_id"   UUID NOT NULL,
    "content"     VARCHAR(1000) NOT NULL,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_posts_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_author_id_fkey"
    FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "community_posts" ADD CONSTRAINT "community_post_content_not_blank"
    CHECK (length(btrim("content")) > 0);

-- Feed hot path: newest-first, cursor-paginated on created_at.
CREATE INDEX "community_posts_created_idx" ON "community_posts" ("created_at" DESC);

-- CommunityComment --------------------------------------------------------
CREATE TABLE "community_comments" (
    "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
    "post_id"     UUID NOT NULL,
    "author_id"   UUID NOT NULL,
    "content"     VARCHAR(500) NOT NULL,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_comments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_post_id_fkey"
    FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_author_id_fkey"
    FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "community_comments" ADD CONSTRAINT "community_comment_content_not_blank"
    CHECK (length(btrim("content")) > 0);

CREATE INDEX "community_comments_post_idx" ON "community_comments" ("post_id");

-- CommunityPostLike -------------------------------------------------------
CREATE TABLE "community_post_likes" (
    "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
    "post_id"     UUID NOT NULL,
    "user_id"     UUID NOT NULL,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_post_likes_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "community_post_likes" ADD CONSTRAINT "community_post_likes_post_id_fkey"
    FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_post_likes" ADD CONSTRAINT "community_post_likes_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A player can only like a given post once -- also the backstop that makes
-- likePost()/unlikePost() idempotent toggles.
CREATE UNIQUE INDEX "community_post_likes_post_user_unique"
    ON "community_post_likes" ("post_id", "user_id");

-- CommunityReport -----------------------------------------------------------
-- target_id has NO FK -- it points into either community_posts or
-- community_comments depending on target_type, an audit-only column like
-- competition_matches.recorded_by/voided_by elsewhere. Cleanup of dangling
-- reports when their target is deleted is the repository's job (see
-- prismaPostRepository.js/prismaCommentRepository.js's delete()), not a DB
-- constraint.
CREATE TABLE "community_reports" (
    "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
    "target_type"   VARCHAR(10) NOT NULL,               -- POST|COMMENT
    "target_id"     UUID NOT NULL,                       -- no FK, see above
    "reporter_id"   UUID NOT NULL,
    "reason"        VARCHAR(300),
    "status"        VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING|DISMISSED
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at"   TIMESTAMP(3),
    "resolved_by"   UUID,                                  -- no FK, audit-only

    CONSTRAINT "community_reports_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_reporter_id_fkey"
    FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "community_reports" ADD CONSTRAINT "community_report_target_type_valid"
    CHECK ("target_type" IN ('POST', 'COMMENT'));
ALTER TABLE "community_reports" ADD CONSTRAINT "community_report_status_valid"
    CHECK ("status" IN ('PENDING', 'DISMISSED'));
ALTER TABLE "community_reports" ADD CONSTRAINT "community_report_resolved_coherent"
    CHECK (
        ("status" = 'DISMISSED' AND "resolved_at" IS NOT NULL AND "resolved_by" IS NOT NULL)
        OR ("status" != 'DISMISSED' AND "resolved_at" IS NULL AND "resolved_by" IS NULL)
    );

-- At most one PENDING report per (target, reporter) -- app layer also
-- checks before creating (see reportContent.js), mirroring
-- challenges_pending_pair_unique's own precedent.
CREATE UNIQUE INDEX "community_reports_pending_unique"
    ON "community_reports" ("target_type", "target_id", "reporter_id") WHERE "status" = 'PENDING';

-- Staff review-queue hot path.
CREATE INDEX "community_reports_status_idx" ON "community_reports" ("status");
-- Cleanup-on-delete hot path (find every report for a given target).
CREATE INDEX "community_reports_target_idx" ON "community_reports" ("target_type", "target_id");
