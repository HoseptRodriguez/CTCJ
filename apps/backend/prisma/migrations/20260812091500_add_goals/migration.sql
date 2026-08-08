-- Goal (Phase 2) --------------------------------------------------------
-- Player-owned personal targets. No progress column here -- current
-- progress is always computed live from competition/coaching/booking data
-- on read, never stored/duplicated, matching how standings/rank are
-- already computed live elsewhere in this codebase. player_id FK is
-- RESTRICT, matching coach_notes'/medical_history_entries' precedent: a
-- player's goal history must never silently disappear.
CREATE TABLE "goals" (
    "id"              UUID NOT NULL DEFAULT gen_random_uuid(),
    "player_id"       UUID NOT NULL,
    "title"           VARCHAR(200) NOT NULL,
    "metric_type"     VARCHAR(20) NOT NULL,   -- SKILL_RATING|MATCH_WINS|RANKING_POSITION|TRAINING_FREQUENCY|CUSTOM
    "target_area"     VARCHAR(20),            -- SKILL_RATING only
    "target_value"    INTEGER,
    "target_category" VARCHAR(20),
    "target_modality" VARCHAR(10),
    "status"          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE|ACHIEVED|ABANDONED
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "achieved_at"     TIMESTAMP(3),
    "abandoned_at"    TIMESTAMP(3),

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "goals" ADD CONSTRAINT "goals_player_id_fkey"
    FOREIGN KEY ("player_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "goals" ADD CONSTRAINT "goal_metric_type_valid"
    CHECK ("metric_type" IN ('SKILL_RATING','MATCH_WINS','RANKING_POSITION','TRAINING_FREQUENCY','CUSTOM'));
ALTER TABLE "goals" ADD CONSTRAINT "goal_target_area_valid"
    CHECK ("target_area" IS NULL OR "target_area" IN (
        'FOREHAND','BACKHAND','SERVE','RETURN','VOLLEY','OVERHEAD',
        'SLICE','FOOTWORK','FITNESS','MENTALITY'
    ));
ALTER TABLE "goals" ADD CONSTRAINT "goal_status_valid"
    CHECK ("status" IN ('ACTIVE','ACHIEVED','ABANDONED'));

CREATE INDEX "goals_player_idx" ON "goals" ("player_id");
