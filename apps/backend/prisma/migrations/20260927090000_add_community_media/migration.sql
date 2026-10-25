-- Community with photos and videos (2026-09-27).
--   * post_media: up to 4 photos OR 1 video per post (the "4 or 1" rule and
--     the per-day limit live in the application; the table only guarantees
--     each row is coherent). Files live in Vercel Blob; `url` is the public
--     URL, used to delete the file together with the post.
--   * community_posts: text becomes optional when the post has media, and a
--     post can be hidden (automatically after 3 reports, or by staff) until
--     Administration reviews it.

-- community_posts: optional text -----------------------------------------------
-- The "text or media" rule spans two tables, so the app enforces it; the
-- column stays NOT NULL ('' when the post is media only).
ALTER TABLE "community_posts" DROP CONSTRAINT "community_post_content_not_blank";

-- community_posts: hiding --------------------------------------------------------
ALTER TABLE "community_posts" ADD COLUMN "hidden_at" TIMESTAMP(3);
ALTER TABLE "community_posts" ADD COLUMN "hidden_by" UUID;              -- no FK, audit-only; NULL = automatic
ALTER TABLE "community_posts" ADD COLUMN "hidden_reason" VARCHAR(20);    -- AUTO_REPORTS|STAFF
ALTER TABLE "community_posts" ADD CONSTRAINT "community_post_hidden_reason_valid"
    CHECK ("hidden_reason" IS NULL OR "hidden_reason" IN ('AUTO_REPORTS', 'STAFF'));
ALTER TABLE "community_posts" ADD CONSTRAINT "community_post_hidden_coherent"
    CHECK (("hidden_at" IS NULL) = ("hidden_reason" IS NULL));

-- post_media ---------------------------------------------------------------------
CREATE TABLE "post_media" (
    "id"               UUID NOT NULL DEFAULT gen_random_uuid(),
    "post_id"          UUID NOT NULL,
    "type"             VARCHAR(10) NOT NULL,          -- IMAGE|VIDEO
    "url"              TEXT NOT NULL,
    "poster_url"       TEXT,                          -- VIDEO only: cover image
    "width"            INTEGER,
    "height"           INTEGER,
    "duration_seconds" NUMERIC(6, 2),                 -- VIDEO only
    "sort_order"       SMALLINT NOT NULL DEFAULT 0,
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_media_pkey" PRIMARY KEY ("id")
);

-- Deleting a post deletes its media rows (the Blob files are deleted by the app).
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_post_id_fkey"
    FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_type_valid"
    CHECK ("type" IN ('IMAGE', 'VIDEO'));
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_video_only_fields"
    CHECK ("type" = 'VIDEO' OR ("duration_seconds" IS NULL AND "poster_url" IS NULL));
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_duration_limit"
    CHECK ("duration_seconds" IS NULL OR ("duration_seconds" > 0 AND "duration_seconds" <= 60));
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_dimensions_positive"
    CHECK (("width" IS NULL OR "width" > 0) AND ("height" IS NULL OR "height" > 0));
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_sort_order_range"
    CHECK ("sort_order" BETWEEN 0 AND 3);

CREATE UNIQUE INDEX "post_media_post_order_unique" ON "post_media" ("post_id", "sort_order");
