-- Physiotherapy (Phase 15) -- shares clinical_appointments/clinical_notes
-- with Psychology (Phase 14), disambiguated by a new discipline column.
-- RecoveryPlan/MedicalHistoryEntry are new Physiotherapy-only tables, no
-- discipline column needed (gated purely by practitioner role).

-- clinical_appointments: add discipline -----------------------------------
-- Backfill first (any pre-existing rows predate this column and were all
-- Psychology, the only discipline that existed before this migration),
-- then enforce NOT NULL.
ALTER TABLE "clinical_appointments" ADD COLUMN "discipline" VARCHAR(20);
UPDATE "clinical_appointments" SET "discipline" = 'PSYCHOLOGY' WHERE "discipline" IS NULL;
ALTER TABLE "clinical_appointments" ALTER COLUMN "discipline" SET NOT NULL;
ALTER TABLE "clinical_appointments" ADD CONSTRAINT "clinical_appointment_discipline_valid"
    CHECK ("discipline" IN ('PSYCHOLOGY', 'PHYSIOTHERAPY'));

-- clinical_notes: add discipline -------------------------------------------
ALTER TABLE "clinical_notes" ADD COLUMN "discipline" VARCHAR(20);
UPDATE "clinical_notes" SET "discipline" = 'PSYCHOLOGY' WHERE "discipline" IS NULL;
ALTER TABLE "clinical_notes" ALTER COLUMN "discipline" SET NOT NULL;
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_note_discipline_valid"
    CHECK ("discipline" IN ('PSYCHOLOGY', 'PHYSIOTHERAPY'));

CREATE INDEX "clinical_appointments_discipline_idx" ON "clinical_appointments" ("discipline");
CREATE INDEX "clinical_notes_discipline_idx" ON "clinical_notes" ("discipline");

-- RecoveryPlan ---------------------------------------------------------------
CREATE TABLE "recovery_plans" (
    "id"                  UUID NOT NULL DEFAULT gen_random_uuid(),
    "player_id"           UUID NOT NULL,
    "practitioner_id"     UUID NOT NULL,                    -- no FK, audit-only
    "title"               TEXT NOT NULL,
    "goal"                TEXT,
    "status"              VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE|COMPLETED|DISCONTINUED
    "visibility"          VARCHAR(20) NOT NULL DEFAULT 'PRIVATE', -- PRIVATE|PLAYER_VISIBLE
    "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at"         TIMESTAMP(3),
    "resolved_by"         UUID,
    "discontinue_reason"  TEXT,

    CONSTRAINT "recovery_plans_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "recovery_plans" ADD CONSTRAINT "recovery_plans_player_id_fkey"
    FOREIGN KEY ("player_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "recovery_plans" ADD CONSTRAINT "recovery_plan_status_valid"
    CHECK ("status" IN ('ACTIVE', 'COMPLETED', 'DISCONTINUED'));
ALTER TABLE "recovery_plans" ADD CONSTRAINT "recovery_plan_visibility_valid"
    CHECK ("visibility" IN ('PRIVATE', 'PLAYER_VISIBLE'));
ALTER TABLE "recovery_plans" ADD CONSTRAINT "recovery_plan_resolved_coherent"
    CHECK (
        ("status" = 'ACTIVE' AND "resolved_at" IS NULL AND "resolved_by" IS NULL AND "discontinue_reason" IS NULL)
        OR ("status" = 'COMPLETED' AND "resolved_at" IS NOT NULL AND "resolved_by" IS NOT NULL AND "discontinue_reason" IS NULL)
        OR ("status" = 'DISCONTINUED' AND "resolved_at" IS NOT NULL AND "resolved_by" IS NOT NULL AND "discontinue_reason" IS NOT NULL)
    );

CREATE INDEX "recovery_plans_player_idx" ON "recovery_plans" ("player_id");

-- MedicalHistoryEntry ---------------------------------------------------------
CREATE TABLE "medical_history_entries" (
    "id"              UUID NOT NULL DEFAULT gen_random_uuid(),
    "player_id"       UUID NOT NULL,
    "practitioner_id" UUID NOT NULL,                    -- no FK, audit-only
    "condition"       TEXT NOT NULL,
    "description"     TEXT,
    "status"          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE|RESOLVED
    "visibility"      VARCHAR(20) NOT NULL DEFAULT 'PRIVATE', -- PRIVATE|PLAYER_VISIBLE
    "occurred_at"     TIMESTAMP(3),
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at"     TIMESTAMP(3),
    "resolved_by"     UUID,

    CONSTRAINT "medical_history_entries_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "medical_history_entries" ADD CONSTRAINT "medical_history_entries_player_id_fkey"
    FOREIGN KEY ("player_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "medical_history_entries" ADD CONSTRAINT "medical_history_status_valid"
    CHECK ("status" IN ('ACTIVE', 'RESOLVED'));
ALTER TABLE "medical_history_entries" ADD CONSTRAINT "medical_history_visibility_valid"
    CHECK ("visibility" IN ('PRIVATE', 'PLAYER_VISIBLE'));
ALTER TABLE "medical_history_entries" ADD CONSTRAINT "medical_history_resolved_coherent"
    CHECK (
        ("status" = 'ACTIVE' AND "resolved_at" IS NULL AND "resolved_by" IS NULL)
        OR ("status" = 'RESOLVED' AND "resolved_at" IS NOT NULL AND "resolved_by" IS NOT NULL)
    );

CREATE INDEX "medical_history_entries_player_idx" ON "medical_history_entries" ("player_id");
