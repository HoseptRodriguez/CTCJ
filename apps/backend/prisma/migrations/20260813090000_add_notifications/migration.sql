-- Notification (Phase 3a) -----------------------------------------------
-- A real in-app inbox -- nothing in this codebase notified anyone of
-- anything before this (confirmed: guardianship/affiliation requests never
-- emailed or otherwise alerted their target). recipient_id is CASCADE, not
-- RESTRICT like coach_notes/goals -- a notification is ephemeral/transient,
-- not a durable record that must "never silently disappear," so it's fine
-- for it to vanish along with the user it was for.
CREATE TABLE "notifications" (
    "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
    "recipient_id" UUID NOT NULL,
    "type"        VARCHAR(30) NOT NULL, -- CHALLENGE_RECEIVED|CHALLENGE_ACCEPTED|CHALLENGE_REJECTED|CHALLENGE_CANCELLED
    "title"       VARCHAR(200) NOT NULL,
    "body"        TEXT,
    "link_path"   VARCHAR(255),
    "read_at"     TIMESTAMP(3),
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_fkey"
    FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notifications" ADD CONSTRAINT "notification_type_valid"
    CHECK ("type" IN ('CHALLENGE_RECEIVED','CHALLENGE_ACCEPTED','CHALLENGE_REJECTED','CHALLENGE_CANCELLED'));

CREATE INDEX "notifications_recipient_idx" ON "notifications" ("recipient_id");
