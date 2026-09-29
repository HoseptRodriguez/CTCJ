-- Notificaciones por correo, comunicados y página pública de torneos.
-- Only ADDS: new tables, optional (nullable) columns, indexes, and two
-- widened CHECK lists (new allowed values; every existing row stays valid).
-- No existing data is modified or deleted.

-- --- Tournaments: public dates and publication ------------------------------
-- published_at: when the club opened registration publicly (/torneos). Null
-- = still an internal draft, never shown on the public site.
ALTER TABLE "tournaments" ADD COLUMN "starts_on" DATE;
ALTER TABLE "tournaments" ADD COLUMN "ends_on" DATE;
ALTER TABLE "tournaments" ADD COLUMN "published_at" TIMESTAMPTZ;
ALTER TABLE "tournaments" ADD CONSTRAINT "tournament_dates_order"
    CHECK ("starts_on" IS NULL OR "ends_on" IS NULL OR "ends_on" >= "starts_on");

-- --- Tournament matches: when and where -------------------------------------
ALTER TABLE "tournament_matches" ADD COLUMN "scheduled_at" TIMESTAMPTZ;
ALTER TABLE "tournament_matches" ADD COLUMN "court_name" VARCHAR(60);

-- --- Notification types: widen the CHECK -----------------------------------
ALTER TABLE "notifications" DROP CONSTRAINT "notification_type_valid";
ALTER TABLE "notifications" ADD CONSTRAINT "notification_type_valid"
    CHECK ("type" IN (
        'CHALLENGE_RECEIVED','CHALLENGE_ACCEPTED','CHALLENGE_REJECTED','CHALLENGE_CANCELLED',
        'CHALLENGE_RESULT_SUBMITTED','CHALLENGE_RESULT_MISMATCH','CHALLENGE_RESULT_CONFIRMED',
        'POST_COMMENT_RECEIVED','PLAN_PRICE_CHANGED',
        'COACH_NOTE_PUBLISHED','PERFORMANCE_RECORDED',
        'TOURNAMENT_OPENED','TOURNAMENT_DRAW_PUBLISHED','TOURNAMENT_MATCH_CHANGED',
        'TOURNAMENT_MATCH_RESULT','TOURNAMENT_CANCELLED',
        'ANNOUNCEMENT'
    ));

-- --- Consents: the guardian may authorize the minor's full name in public --
ALTER TABLE "consents" DROP CONSTRAINT "consent_type_valid";
ALTER TABLE "consents" ADD CONSTRAINT "consent_type_valid"
    CHECK ("consent_type" IN ('PRIVACY_POLICY', 'TERMS', 'MARKETING', 'MINOR_DATA_IMAGE',
                              'HEALTH_DATA', 'COMMUNITY_RULES', 'COOKIES', 'MINOR_PUBLIC_NAME'));

-- --- Service-notification preferences (per category and channel) ----------
-- Promotional categories are NOT here: they are the MARKETING consent
-- (consents table), off until the person turns them on. A missing row means
-- "on" (service notifications come activated).
CREATE TABLE "notification_preferences" (
    "user_id"    UUID        NOT NULL,
    "category"   VARCHAR(30) NOT NULL,
    "channel"    VARCHAR(10) NOT NULL,
    "enabled"    BOOLEAN     NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("user_id", "category", "channel")
);
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preference_category_valid"
    CHECK ("category" IN ('RESULTS_NOTES', 'MY_TOURNAMENTS', 'CLUB_NOTICES'));
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preference_channel_valid"
    CHECK ("channel" IN ('APP', 'EMAIL', 'PUSH'));

CREATE TABLE "notification_settings" (
    "user_id"      UUID        NOT NULL,
    "daily_digest" BOOLEAN     NOT NULL DEFAULT false,
    "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("user_id")
);
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- --- Announcements (Comunicados) --------------------------------------------
CREATE TABLE "announcements" (
    "id"                     UUID         NOT NULL DEFAULT gen_random_uuid(),
    "club_id"                UUID         NOT NULL,
    "title"                  VARCHAR(120) NOT NULL,
    "body"                   TEXT         NOT NULL,
    "image_url"              TEXT,
    "image_alt"              VARCHAR(200),
    "kind"                   VARCHAR(15)  NOT NULL,
    "audience_type"          VARCHAR(15)  NOT NULL,
    "audience_category"      VARCHAR(20),
    "audience_tournament_id" UUID,
    "status"                 VARCHAR(15)  NOT NULL DEFAULT 'SCHEDULED',
    "scheduled_for"          TIMESTAMPTZ  NOT NULL,
    "dispatched_at"          TIMESTAMPTZ,
    "recipients_count"       INTEGER,
    "excluded_count"         INTEGER,
    "created_by"             UUID         NOT NULL,
    "created_at"             TIMESTAMPTZ  NOT NULL DEFAULT now(),
    "cancelled_at"           TIMESTAMPTZ,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_club_id_fkey"
    FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "announcements" ADD CONSTRAINT "announcement_kind_valid"
    CHECK ("kind" IN ('SERVICE', 'PROMOTIONAL'));
ALTER TABLE "announcements" ADD CONSTRAINT "announcement_audience_valid"
    CHECK (
        ("audience_type" IN ('ALL', 'PLAYERS', 'GUARDIANS')
            AND "audience_category" IS NULL AND "audience_tournament_id" IS NULL)
        OR ("audience_type" = 'CATEGORY'
            AND "audience_category" IN ('SEGUNDA', 'TERCERA', 'CUARTA', 'QUINTA')
            AND "audience_tournament_id" IS NULL)
        OR ("audience_type" = 'TOURNAMENT'
            AND "audience_tournament_id" IS NOT NULL AND "audience_category" IS NULL)
    );
ALTER TABLE "announcements" ADD CONSTRAINT "announcement_status_valid"
    CHECK ("status" IN ('SCHEDULED', 'SENT', 'CANCELLED'));
ALTER TABLE "announcements" ADD CONSTRAINT "announcement_image_alt"
    CHECK (("image_url" IS NULL) = ("image_alt" IS NULL));
CREATE INDEX "announcements_club_created_idx" ON "announcements" ("club_id", "created_at" DESC);
CREATE INDEX "announcements_due_idx" ON "announcements" ("scheduled_for") WHERE "status" = 'SCHEDULED';

-- --- Email deliveries: one row per email to one person ----------------------
-- The send queue and its history (sent, failed, opened). recipient_user_id
-- is who receives it (a minor's guardian, for a minor); about_user_id is
-- the person it is about. No health data is ever written here.
CREATE TABLE "email_deliveries" (
    "id"                  UUID         NOT NULL DEFAULT gen_random_uuid(),
    "recipient_user_id"   UUID,
    "about_user_id"       UUID,
    "to_email"            VARCHAR(254) NOT NULL,
    "kind"                VARCHAR(15)  NOT NULL,
    "category"            VARCHAR(30)  NOT NULL,
    "subject"             VARCHAR(200) NOT NULL,
    "html"                TEXT         NOT NULL,
    "text"                TEXT         NOT NULL,
    "source_type"         VARCHAR(20)  NOT NULL,
    "source_id"           UUID,
    "status"              VARCHAR(15)  NOT NULL DEFAULT 'QUEUED',
    "not_before"          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    "deferred_reason"     VARCHAR(20),
    "attempts"            SMALLINT     NOT NULL DEFAULT 0,
    "last_error"          TEXT,
    "provider_message_id" VARCHAR(100),
    "sent_at"             TIMESTAMPTZ,
    "opened_at"           TIMESTAMPTZ,
    "created_at"          TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT "email_deliveries_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "email_deliveries" ADD CONSTRAINT "email_deliveries_recipient_fkey"
    FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "email_deliveries" ADD CONSTRAINT "email_deliveries_about_fkey"
    FOREIGN KEY ("about_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "email_deliveries" ADD CONSTRAINT "email_delivery_kind_valid"
    CHECK ("kind" IN ('SERVICE', 'PROMOTIONAL'));
ALTER TABLE "email_deliveries" ADD CONSTRAINT "email_delivery_status_valid"
    CHECK ("status" IN ('QUEUED', 'DIGEST', 'SENT', 'FAILED', 'CANCELLED'));
ALTER TABLE "email_deliveries" ADD CONSTRAINT "email_delivery_source_valid"
    CHECK ("source_type" IN ('EVENT', 'ANNOUNCEMENT', 'DIGEST'));
ALTER TABLE "email_deliveries" ADD CONSTRAINT "email_delivery_attempts_range"
    CHECK ("attempts" BETWEEN 0 AND 3);
CREATE INDEX "email_deliveries_due_idx" ON "email_deliveries" ("not_before") WHERE "status" = 'QUEUED';
CREATE INDEX "email_deliveries_digest_idx" ON "email_deliveries" ("recipient_user_id") WHERE "status" = 'DIGEST';
CREATE INDEX "email_deliveries_source_idx" ON "email_deliveries" ("source_type", "source_id");
CREATE INDEX "email_deliveries_sent_idx" ON "email_deliveries" ("sent_at") WHERE "sent_at" IS NOT NULL;
CREATE UNIQUE INDEX "email_deliveries_provider_id_key" ON "email_deliveries" ("provider_message_id");
