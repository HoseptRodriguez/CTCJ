-- CoachNote ---------------------------------------------------------------
-- Append-only staff-authored record about a specific player (training/
-- technical/tactical notes + recommendations). No update/delete this phase --
-- the note history itself IS the "track player progress" feature, no
-- separate metrics table (see the Phase 10 plan). player_id FK is RESTRICT,
-- not CASCADE (unlike membership_adjustments' cascade-with-parent shape) --
-- mirrors invoices' Phase 8 precedent: a player's note history must never
-- silently disappear. coach_id has no FK, audit-only -- matches
-- authorized_by/recorded_by/generated_by precedent used everywhere else in
-- this codebase.
CREATE TABLE "coach_notes" (
    "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
    "player_id"   UUID NOT NULL,
    "coach_id"    UUID NOT NULL,               -- no FK, audit-only
    "note_type"   VARCHAR(20) NOT NULL,        -- TRAINING|TECHNICAL|TACTICAL|RECOMMENDATION
    "visibility"  VARCHAR(20) NOT NULL DEFAULT 'PRIVATE', -- PRIVATE|PLAYER_VISIBLE
    "content"     TEXT NOT NULL,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coach_notes_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "coach_notes" ADD CONSTRAINT "coach_notes_player_id_fkey"
    FOREIGN KEY ("player_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "coach_notes" ADD CONSTRAINT "coach_note_type_valid"
    CHECK ("note_type" IN ('TRAINING','TECHNICAL','TACTICAL','RECOMMENDATION'));
ALTER TABLE "coach_notes" ADD CONSTRAINT "coach_note_visibility_valid"
    CHECK ("visibility" IN ('PRIVATE','PLAYER_VISIBLE'));

CREATE INDEX "coach_notes_player_idx" ON "coach_notes" ("player_id");
