-- "Solicitar información" (2026-10-03): requests from the home and the
-- program pages, the staff inbox, and the proof of the authorization.
--   * info_requests: who asks (name, phone, optional email), for which
--     program, for themself or a child (only the child's AGE, never their
--     name), preferred times and a short message.
--   * info_request_notes: internal notes of the staff (who, when).
--   * info_request_consents: proof of the authorization given in the form
--     (Ley 1581 de 2012). The person has no account, so it can't go in
--     consents (user_id is required there). Append-only, like consents.
--   * Only adds tables, indexes and a trigger: no existing data changes.

CREATE TABLE "info_requests" (
    "id"               UUID NOT NULL DEFAULT gen_random_uuid(),
    "club_id"          UUID NOT NULL,
    "full_name"        VARCHAR(120) NOT NULL,
    "phone"            VARCHAR(16) NOT NULL,
    "email"            VARCHAR(160),
    "program"          VARCHAR(20) NOT NULL,
    "for_whom"         VARCHAR(6) NOT NULL,
    "child_age"        SMALLINT,
    "preferred_times"  TEXT[] NOT NULL DEFAULT '{}',
    "message"          VARCHAR(500),
    "marketing_opt_in" BOOLEAN NOT NULL DEFAULT false,
    "status"           VARCHAR(12) NOT NULL DEFAULT 'NUEVA',
    "handled_by"       UUID,
    "handled_at"       TIMESTAMPTZ,
    "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "info_requests_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "info_requests" ADD CONSTRAINT "info_requests_club_id_fkey"
    FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "info_requests" ADD CONSTRAINT "info_requests_handled_by_fkey"
    FOREIGN KEY ("handled_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "info_requests" ADD CONSTRAINT "info_request_program_valid"
    CHECK ("program" IN ('ADULTOS', 'ESCUELA_INFANTIL', 'COMPETENCIA', 'NO_SEGURO'));
ALTER TABLE "info_requests" ADD CONSTRAINT "info_request_for_valid"
    CHECK ("for_whom" IN ('SELF', 'CHILD'));
ALTER TABLE "info_requests" ADD CONSTRAINT "info_request_status_valid"
    CHECK ("status" IN ('NUEVA', 'CONTACTADA', 'INSCRITA', 'DESCARTADA'));
-- Only a child's age, and only when it's for a child.
ALTER TABLE "info_requests" ADD CONSTRAINT "info_request_child_age_valid"
    CHECK (("for_whom" = 'CHILD' AND "child_age" BETWEEN 1 AND 17)
        OR ("for_whom" = 'SELF' AND "child_age" IS NULL));
CREATE INDEX "info_requests_status_idx" ON "info_requests" ("club_id", "status", "created_at" DESC);

CREATE TABLE "info_request_notes" (
    "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
    "request_id" UUID NOT NULL,
    "author_id"  UUID,
    "text"       VARCHAR(1000) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "info_request_notes_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "info_request_notes" ADD CONSTRAINT "info_request_notes_request_id_fkey"
    FOREIGN KEY ("request_id") REFERENCES "info_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "info_request_notes" ADD CONSTRAINT "info_request_notes_author_id_fkey"
    FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "info_request_notes_request_idx" ON "info_request_notes" ("request_id", "created_at");

-- Proof of the authorization. Kept when the request is deleted (request_id
-- becomes NULL), so the proof outlives the data, like consents.
CREATE TABLE "info_request_consents" (
    "id"               UUID NOT NULL DEFAULT gen_random_uuid(),
    "request_id"       UUID,
    "consent_type"     VARCHAR(30) NOT NULL,
    "document_version" VARCHAR(20) NOT NULL,
    "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "info_request_consents_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "info_request_consents" ADD CONSTRAINT "info_request_consents_request_id_fkey"
    FOREIGN KEY ("request_id") REFERENCES "info_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "info_request_consents" ADD CONSTRAINT "info_request_consent_type_valid"
    CHECK ("consent_type" IN ('INFO_REQUEST_PRIVACY', 'MARKETING'));
CREATE INDEX "info_request_consents_request_idx" ON "info_request_consents" ("request_id");

-- Never rewritten, except the automatic NULL when the request is deleted.
CREATE FUNCTION "info_request_consents_forbid_update"() RETURNS trigger AS $$
BEGIN
  IF NEW."request_id" IS NULL AND OLD."request_id" IS NOT NULL
     AND NEW."consent_type" = OLD."consent_type"
     AND NEW."document_version" = OLD."document_version"
     AND NEW."created_at" = OLD."created_at" THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'info_request_consents is append-only';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "info_request_consents_no_update" BEFORE UPDATE ON "info_request_consents"
    FOR EACH ROW EXECUTE FUNCTION "info_request_consents_forbid_update"();
