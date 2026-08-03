-- AffiliationRequest -----------------------------------------------------
CREATE TABLE "affiliation_requests" (
    "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id"        UUID NOT NULL,
    "status"         VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "requested_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at"     TIMESTAMP(3),
    "decided_by"     UUID,
    "notes"          TEXT,
    "decision_notes" TEXT,

    CONSTRAINT "affiliation_requests_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "affiliation_requests" ADD CONSTRAINT "affiliation_requests_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "affiliation_requests" ADD CONSTRAINT "affiliation_request_status_valid"
    CHECK ("status" IN ('PENDING','APPROVED','REJECTED'));

-- Decision coherence, mirroring user_roles_revocation_coherence's pattern.
ALTER TABLE "affiliation_requests" ADD CONSTRAINT "affiliation_request_decision_coherence"
    CHECK (("status" = 'PENDING') = ("decided_at" IS NULL));
ALTER TABLE "affiliation_requests" ADD CONSTRAINT "affiliation_request_decided_by_coherence"
    CHECK (("decided_at" IS NULL) = ("decided_by" IS NULL));

-- One PENDING request per user.
CREATE UNIQUE INDEX "affiliation_requests_pending_unique"
    ON "affiliation_requests" ("user_id") WHERE "status" = 'PENDING';

CREATE INDEX "affiliation_requests_user_idx" ON "affiliation_requests" ("user_id");
CREATE INDEX "affiliation_requests_status_idx" ON "affiliation_requests" ("status")
    WHERE "status" = 'PENDING';

-- Guardianship ------------------------------------------------------------
CREATE TABLE "guardianships" (
    "id"                UUID NOT NULL DEFAULT gen_random_uuid(),
    "guardian_user_id"  UUID NOT NULL,
    "minor_user_id"     UUID NOT NULL,
    "can_pay"           BOOLEAN NOT NULL DEFAULT false,
    "can_book"          BOOLEAN NOT NULL DEFAULT false,
    "status"            VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "requested_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at"        TIMESTAMP(3),
    "decided_by"        UUID,
    "decision_notes"    TEXT,

    CONSTRAINT "guardianships_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "guardianships" ADD CONSTRAINT "guardianships_guardian_user_id_fkey"
    FOREIGN KEY ("guardian_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "guardianships" ADD CONSTRAINT "guardianships_minor_user_id_fkey"
    FOREIGN KEY ("minor_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "guardianships" ADD CONSTRAINT "guardianship_status_valid"
    CHECK ("status" IN ('PENDING','APPROVED','REJECTED'));
ALTER TABLE "guardianships" ADD CONSTRAINT "guardianship_no_self_link"
    CHECK ("guardian_user_id" <> "minor_user_id");
ALTER TABLE "guardianships" ADD CONSTRAINT "guardianship_decision_coherence"
    CHECK (("status" = 'PENDING') = ("decided_at" IS NULL));
ALTER TABLE "guardianships" ADD CONSTRAINT "guardianship_decided_by_coherence"
    CHECK (("decided_at" IS NULL) = ("decided_by" IS NULL));

-- One PENDING-or-APPROVED row per (guardian, minor) pair.
CREATE UNIQUE INDEX "guardianships_active_pair_unique"
    ON "guardianships" ("guardian_user_id", "minor_user_id")
    WHERE "status" IN ('PENDING','APPROVED');

CREATE INDEX "guardianships_guardian_idx" ON "guardianships" ("guardian_user_id");
CREATE INDEX "guardianships_minor_idx" ON "guardianships" ("minor_user_id");
-- Fast path for canBookForMinor's read.
CREATE INDEX "guardianships_bookable_idx" ON "guardianships" ("guardian_user_id", "minor_user_id")
    WHERE "status" = 'APPROVED' AND "can_book" = true;
