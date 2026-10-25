-- Administration's access to Physiotherapy (club decision, 2026-09-26):
--   * physio_fitness_statuses: the "Apto / No apto para jugar hasta [fecha]"
--     a Fisioterapeuta records. Operational only -- no diagnosis, no text.
--     Append-only history; the newest row per player is the current status.
--   * clinical_access_consents: the player's own authorization for the club
--     administration to read their physiotherapy notes, with the date it was
--     granted and the date it was withdrawn. Append-only as well: withdrawing
--     sets revoked_at, granting again inserts a new row.
-- Reads of clinical notes are recorded in the existing audit_logs table
-- (no schema change needed there).

-- physio_fitness_statuses ----------------------------------------------------
CREATE TABLE "physio_fitness_statuses" (
    "id"              UUID NOT NULL DEFAULT gen_random_uuid(),
    "player_id"       UUID NOT NULL,
    "practitioner_id" UUID NOT NULL,                  -- no FK, audit-only
    "status"          VARCHAR(10) NOT NULL,           -- FIT|UNFIT
    "unfit_until"     DATE,                           -- only for UNFIT; NULL = until further notice
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "physio_fitness_statuses_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "physio_fitness_statuses" ADD CONSTRAINT "physio_fitness_statuses_player_id_fkey"
    FOREIGN KEY ("player_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "physio_fitness_statuses" ADD CONSTRAINT "physio_fitness_status_valid"
    CHECK ("status" IN ('FIT', 'UNFIT'));
ALTER TABLE "physio_fitness_statuses" ADD CONSTRAINT "physio_fitness_until_only_when_unfit"
    CHECK ("status" = 'UNFIT' OR "unfit_until" IS NULL);

CREATE INDEX "physio_fitness_statuses_player_idx"
    ON "physio_fitness_statuses" ("player_id", "created_at" DESC);

-- clinical_access_consents ---------------------------------------------------
CREATE TABLE "clinical_access_consents" (
    "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
    "player_id"  UUID NOT NULL,
    "scope"      VARCHAR(40) NOT NULL,               -- ADMIN_PHYSIO_NOTES
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "clinical_access_consents_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "clinical_access_consents" ADD CONSTRAINT "clinical_access_consents_player_id_fkey"
    FOREIGN KEY ("player_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "clinical_access_consents" ADD CONSTRAINT "clinical_access_consent_scope_valid"
    CHECK ("scope" IN ('ADMIN_PHYSIO_NOTES'));
ALTER TABLE "clinical_access_consents" ADD CONSTRAINT "clinical_access_consent_revoked_after_granted"
    CHECK ("revoked_at" IS NULL OR "revoked_at" >= "granted_at");

-- At most one active (not withdrawn) authorization per player and scope.
CREATE UNIQUE INDEX "clinical_access_consents_one_active"
    ON "clinical_access_consents" ("player_id", "scope") WHERE "revoked_at" IS NULL;
CREATE INDEX "clinical_access_consents_player_idx"
    ON "clinical_access_consents" ("player_id", "granted_at" DESC);
