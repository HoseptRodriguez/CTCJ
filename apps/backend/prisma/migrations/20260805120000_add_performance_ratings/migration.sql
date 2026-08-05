-- PerformanceRating ---------------------------------------------------------
-- Append-only staff-authored skill assessment, one row per (player, area,
-- point in time) -- a time series, not a mutable "current rating" (matches
-- coach_notes' shape: the rating history itself IS the "track progress/
-- technical evolution" feature, no separate metrics/session table). Extends
-- the coaching module rather than a new bounded context -- same actor
-- (coach/admin), same subject (a JUGADOR), same purpose as coach_notes.
-- player_id FK is RESTRICT, not CASCADE, matching coach_notes' precedent: a
-- player's rating history must never silently disappear. coach_id has no
-- FK, audit-only -- matches authorized_by/recorded_by/generated_by/
-- coach_notes.coach_id precedent used everywhere else in this codebase.
CREATE TABLE "performance_ratings" (
    "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
    "player_id"   UUID NOT NULL,
    "coach_id"    UUID NOT NULL,               -- no FK, audit-only
    "area"        VARCHAR(20) NOT NULL,        -- FOREHAND|BACKHAND|SERVE|RETURN|VOLLEY|OVERHEAD
    "rating"      SMALLINT NOT NULL,            -- 1-10
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performance_ratings_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "performance_ratings" ADD CONSTRAINT "performance_ratings_player_id_fkey"
    FOREIGN KEY ("player_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "performance_ratings" ADD CONSTRAINT "performance_rating_area_valid"
    CHECK ("area" IN ('FOREHAND','BACKHAND','SERVE','RETURN','VOLLEY','OVERHEAD'));
ALTER TABLE "performance_ratings" ADD CONSTRAINT "performance_rating_value_range"
    CHECK ("rating" BETWEEN 1 AND 10);

CREATE INDEX "performance_ratings_player_idx" ON "performance_ratings" ("player_id");
