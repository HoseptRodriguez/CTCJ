-- Clinical (Phase 14) -- Psychology slice -----------------------------------
-- ClinicalAppointment carries zero clinical content by design (scheduling
-- logistics only). ClinicalNote is append-only, mirrors coach_notes exactly.
-- btree_gist is already enabled by the init migration -- no re-enable needed.

-- ClinicalAppointment ---------------------------------------------------------
-- period/period_start/period_end reuse Reservation's exact range-type
-- pattern (see 20260731180029_init_identity_booking's "reservations: range
-- period + structural double-booking prevention" section).
CREATE TABLE "clinical_appointments" (
    "id"              UUID NOT NULL DEFAULT gen_random_uuid(),
    "club_id"         UUID NOT NULL,
    "player_id"       UUID NOT NULL,
    "practitioner_id" UUID NOT NULL,                    -- no FK, audit-only
    "period"          TSTZRANGE NOT NULL,
    "period_start"    TIMESTAMPTZ GENERATED ALWAYS AS (lower("period")) STORED,
    "period_end"      TIMESTAMPTZ GENERATED ALWAYS AS (upper("period")) STORED,
    "status"          VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED', -- SCHEDULED|COMPLETED|CANCELLED|NO_SHOW
    "scheduled_by"    UUID NOT NULL,                    -- no FK, audit-only
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at"    TIMESTAMP(3),
    "cancelled_by"    UUID,
    "cancel_reason"   TEXT,
    "resolved_at"     TIMESTAMP(3),                      -- set when COMPLETED or NO_SHOW
    "resolved_by"     UUID,

    CONSTRAINT "clinical_appointments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "clinical_appointments" ADD CONSTRAINT "clinical_appointments_club_id_fkey"
    FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "clinical_appointments" ADD CONSTRAINT "clinical_appointments_player_id_fkey"
    FOREIGN KEY ("player_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "clinical_appointments" ADD CONSTRAINT "clinical_appointment_status_valid"
    CHECK ("status" IN ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'));

ALTER TABLE "clinical_appointments" ADD CONSTRAINT "clinical_appointment_cancelled_coherent"
    CHECK (
        ("status" = 'CANCELLED' AND "cancelled_at" IS NOT NULL AND "cancelled_by" IS NOT NULL)
        OR ("status" != 'CANCELLED' AND "cancelled_at" IS NULL AND "cancelled_by" IS NULL)
    );
ALTER TABLE "clinical_appointments" ADD CONSTRAINT "clinical_appointment_resolved_coherent"
    CHECK (
        ("status" IN ('COMPLETED', 'NO_SHOW') AND "resolved_at" IS NOT NULL AND "resolved_by" IS NOT NULL)
        OR ("status" NOT IN ('COMPLETED', 'NO_SHOW') AND "resolved_at" IS NULL AND "resolved_by" IS NULL)
    );

-- A practitioner can never have two overlapping SCHEDULED appointments,
-- enforced by Postgres itself -- reuses booking's exact
-- reservation_no_overlap pattern.
ALTER TABLE "clinical_appointments" ADD CONSTRAINT "clinical_appointment_no_overlap"
    EXCLUDE USING gist (
        "practitioner_id" WITH =,
        "period" WITH &&
    ) WHERE ("status" = 'SCHEDULED');

CREATE INDEX "clinical_appointments_practitioner_period_gist_idx" ON "clinical_appointments" USING gist ("practitioner_id", "period");
CREATE INDEX "clinical_appointments_player_idx" ON "clinical_appointments" ("player_id");
CREATE INDEX "clinical_appointments_club_idx" ON "clinical_appointments" ("club_id");

-- ClinicalNote ------------------------------------------------------------------
CREATE TABLE "clinical_notes" (
    "id"              UUID NOT NULL DEFAULT gen_random_uuid(),
    "player_id"       UUID NOT NULL,
    "practitioner_id" UUID NOT NULL,                    -- no FK, audit-only
    "appointment_id"  UUID,                              -- optional cross-reference
    "note_type"       VARCHAR(20) NOT NULL,               -- FOLLOW_UP|RECOMMENDATION|SESSION_NOTE|GENERAL
    "visibility"      VARCHAR(20) NOT NULL DEFAULT 'PRIVATE', -- PRIVATE|PLAYER_VISIBLE
    "content"         TEXT NOT NULL,
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinical_notes_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_player_id_fkey"
    FOREIGN KEY ("player_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_appointment_id_fkey"
    FOREIGN KEY ("appointment_id") REFERENCES "clinical_appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_note_type_valid"
    CHECK ("note_type" IN ('FOLLOW_UP', 'RECOMMENDATION', 'SESSION_NOTE', 'GENERAL'));
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_note_visibility_valid"
    CHECK ("visibility" IN ('PRIVATE', 'PLAYER_VISIBLE'));

CREATE INDEX "clinical_notes_player_idx" ON "clinical_notes" ("player_id");
CREATE INDEX "clinical_notes_appointment_idx" ON "clinical_notes" ("appointment_id");
