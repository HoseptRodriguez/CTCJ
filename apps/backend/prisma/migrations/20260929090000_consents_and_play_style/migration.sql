-- Consents and play style (2026-09-29).
--   * consents: proof of every authorization (Ley 1581 de 2012: the
--     responsible party must keep proof of each authorization). Append-only:
--     a withdrawal is a new row, never an update or a delete. It replaces
--     users.accepted_terms_at / accepted_privacy_at, whose dates are first
--     copied here as acceptance of version 1 of each document so no proof is
--     lost (both were empty in ctcj_dev and ctcj_test when this was written).
--   * MINOR_DATA_IMAGE: the guardian's authorization for the data and image
--     of a linked minor (user_id = the minor, given_by = the guardian).
--     Until it exists, a minor's account is "pending guardian authorization".
--   * users.dominant_hand / backhand: optional play style, visible to the
--     player and the coaches.

-- consents ----------------------------------------------------------------------
CREATE TABLE "consents" (
    "id"               UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id"          UUID NOT NULL,          -- whose data the consent is about
    "given_by"         UUID,                   -- who gave it when not the user (a guardian); NULL = the user
    "consent_type"     VARCHAR(30) NOT NULL,
    "document_version" VARCHAR(20) NOT NULL,   -- version of the text accepted (legal_documents, Parte 3)
    "action"           VARCHAR(10) NOT NULL,   -- ACCEPTED | WITHDRAWN
    "details"          JSONB,                  -- e.g. marketing channels
    "ip_address"       INET,
    "user_agent"       TEXT,
    "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "consents_pkey" PRIMARY KEY ("id")
);
-- RESTRICT: the proof outlives any attempt to hard-delete the account
-- (account deletion anonymizes instead, Parte 5).
ALTER TABLE "consents" ADD CONSTRAINT "consents_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consents" ADD CONSTRAINT "consents_given_by_fkey"
    FOREIGN KEY ("given_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consents" ADD CONSTRAINT "consent_type_valid"
    CHECK ("consent_type" IN ('PRIVACY_POLICY', 'TERMS', 'MARKETING', 'MINOR_DATA_IMAGE',
                              'HEALTH_DATA', 'COMMUNITY_RULES', 'COOKIES'));
ALTER TABLE "consents" ADD CONSTRAINT "consent_action_valid"
    CHECK ("action" IN ('ACCEPTED', 'WITHDRAWN'));
CREATE INDEX "consents_user_type_idx" ON "consents" ("user_id", "consent_type", "created_at" DESC);

-- Never rewritten: corrections and withdrawals are new rows.
CREATE FUNCTION "consents_forbid_update"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'consents is append-only: add a new row instead of updating one';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "consents_no_update" BEFORE UPDATE ON "consents"
    FOR EACH ROW EXECUTE FUNCTION "consents_forbid_update"();

-- Keep the existing acceptance dates as version 1 before dropping the columns.
INSERT INTO "consents" ("user_id", "consent_type", "document_version", "action", "details", "created_at")
SELECT "id", 'PRIVACY_POLICY', '1', 'ACCEPTED', '{"migratedFrom": "users.accepted_privacy_at"}'::jsonb,
       "accepted_privacy_at"
  FROM "users" WHERE "accepted_privacy_at" IS NOT NULL;
INSERT INTO "consents" ("user_id", "consent_type", "document_version", "action", "details", "created_at")
SELECT "id", 'TERMS', '1', 'ACCEPTED', '{"migratedFrom": "users.accepted_terms_at"}'::jsonb,
       "accepted_terms_at"
  FROM "users" WHERE "accepted_terms_at" IS NOT NULL;

ALTER TABLE "users" DROP COLUMN "accepted_terms_at";
ALTER TABLE "users" DROP COLUMN "accepted_privacy_at";

-- users: play style (optional) -----------------------------------------------------
ALTER TABLE "users" ADD COLUMN "dominant_hand" VARCHAR(12);   -- RIGHT | LEFT | AMBIDEXTROUS
ALTER TABLE "users" ADD COLUMN "backhand" VARCHAR(10);        -- ONE_HANDED | TWO_HANDED
ALTER TABLE "users" ADD CONSTRAINT "user_dominant_hand_valid"
    CHECK ("dominant_hand" IS NULL OR "dominant_hand" IN ('RIGHT', 'LEFT', 'AMBIDEXTROUS'));
ALTER TABLE "users" ADD CONSTRAINT "user_backhand_valid"
    CHECK ("backhand" IS NULL OR "backhand" IN ('ONE_HANDED', 'TWO_HANDED'));
