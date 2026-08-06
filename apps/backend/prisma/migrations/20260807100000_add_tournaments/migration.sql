-- Tournament (Phase 13) --------------------------------------------------
-- Staff-run single-elimination brackets, seeded by competition's live
-- standings. Fully separate from competition's ranking ladder -- a
-- tournament match's result affects ONLY the bracket, never the season
-- standings.

-- Tournament -----------------------------------------------------------------
CREATE TABLE "tournaments" (
    "id"                UUID NOT NULL DEFAULT gen_random_uuid(),
    "club_id"           UUID NOT NULL,
    "name"              VARCHAR(60) NOT NULL,
    "category"          VARCHAR(20) NOT NULL,           -- SEGUNDA|TERCERA|CUARTA|QUINTA
    "modality"          VARCHAR(10) NOT NULL,            -- SINGLES|DOBLES
    "status"            VARCHAR(20) NOT NULL DEFAULT 'DRAFT', -- DRAFT|DRAW_GENERATED|COMPLETED|CANCELLED
    "created_by"        UUID NOT NULL,                   -- no FK, audit-only
    "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "draw_generated_at" TIMESTAMP(3),
    "completed_at"      TIMESTAMP(3),
    "cancelled_at"      TIMESTAMP(3),
    "champion_id"       UUID,                            -- no FK -- points at tournament_participants.id once COMPLETED

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_club_id_fkey"
    FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tournaments" ADD CONSTRAINT "tournament_status_valid"
    CHECK ("status" IN ('DRAFT', 'DRAW_GENERATED', 'COMPLETED', 'CANCELLED'));
ALTER TABLE "tournaments" ADD CONSTRAINT "tournament_category_valid"
    CHECK ("category" IN ('SEGUNDA', 'TERCERA', 'CUARTA', 'QUINTA'));
ALTER TABLE "tournaments" ADD CONSTRAINT "tournament_modality_valid"
    CHECK ("modality" IN ('SINGLES', 'DOBLES'));

ALTER TABLE "tournaments" ADD CONSTRAINT "tournament_draw_generated_coherent"
    CHECK (
        ("status" IN ('DRAW_GENERATED', 'COMPLETED') AND "draw_generated_at" IS NOT NULL)
        OR ("status" IN ('DRAFT', 'CANCELLED') AND "draw_generated_at" IS NULL)
    );
ALTER TABLE "tournaments" ADD CONSTRAINT "tournament_completed_coherent"
    CHECK (
        ("status" = 'COMPLETED' AND "completed_at" IS NOT NULL AND "champion_id" IS NOT NULL)
        OR ("status" != 'COMPLETED' AND "completed_at" IS NULL AND "champion_id" IS NULL)
    );
ALTER TABLE "tournaments" ADD CONSTRAINT "tournament_cancelled_coherent"
    CHECK (
        ("status" = 'CANCELLED' AND "cancelled_at" IS NOT NULL)
        OR ("status" != 'CANCELLED' AND "cancelled_at" IS NULL)
    );

CREATE INDEX "tournaments_club_idx" ON "tournaments" ("club_id");

-- TournamentParticipant -------------------------------------------------------
-- One bracket "entry" -- 1 player for SINGLES, a FIXED pair for DOBLES.
CREATE TABLE "tournament_participants" (
    "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
    "tournament_id" UUID NOT NULL,
    "seed"          SMALLINT,                            -- assigned at draw-generation time, null before
    "registered_by" UUID NOT NULL,                        -- no FK, audit-only
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_participants_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_tournament_id_fkey"
    FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "tournament_participants_tournament_idx" ON "tournament_participants" ("tournament_id");

-- TournamentParticipantMember -------------------------------------------------
CREATE TABLE "tournament_participant_members" (
    "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
    "participant_id" UUID NOT NULL,
    "player_id"      UUID NOT NULL,

    CONSTRAINT "tournament_participant_members_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "tournament_participant_members" ADD CONSTRAINT "tournament_participant_members_participant_id_fkey"
    FOREIGN KEY ("participant_id") REFERENCES "tournament_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tournament_participant_members" ADD CONSTRAINT "tournament_participant_members_player_id_fkey"
    FOREIGN KEY ("player_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "tournament_participant_members_participant_player_unique"
    ON "tournament_participant_members" ("participant_id", "player_id");
CREATE INDEX "tournament_participant_members_player_idx" ON "tournament_participant_members" ("player_id");

-- TournamentMatch --------------------------------------------------------------
-- A bracket slot. "Which match feeds which next match" is derived by
-- (round, slot) arithmetic at the application layer, not stored as a graph.
CREATE TABLE "tournament_matches" (
    "id"                    UUID NOT NULL DEFAULT gen_random_uuid(),
    "tournament_id"         UUID NOT NULL,
    "round"                 SMALLINT NOT NULL,            -- 1-indexed, round 1 = first round
    "slot"                  SMALLINT NOT NULL,             -- 0-indexed position within the round
    "participant_a_id"      UUID,
    "participant_b_id"      UUID,
    "sets_won_a"            SMALLINT,                      -- null for byes -- no match was actually played
    "sets_won_b"            SMALLINT,
    "winner_participant_id" UUID,
    "played_at"             DATE,
    "recorded_by"           UUID,                          -- no FK, audit-only; null for byes
    "notes"                 TEXT,
    "created_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_matches_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_tournament_id_fkey"
    FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- CASCADE, not RESTRICT: a tournament_participants row can only ever be
-- deleted via its whole Tournament cascading (removeParticipant is only
-- legal pre-draw, before any tournament_matches rows referencing it exist),
-- so RESTRICT here would only create a same-statement cascade-ordering race
-- against tournament_participants' own CASCADE from tournaments -- with no
-- actual protective value, since there's no code path that deletes a
-- participant independently once matches reference it.
ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_participant_a_id_fkey"
    FOREIGN KEY ("participant_a_id") REFERENCES "tournament_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_participant_b_id_fkey"
    FOREIGN KEY ("participant_b_id") REFERENCES "tournament_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_winner_participant_id_fkey"
    FOREIGN KEY ("winner_participant_id") REFERENCES "tournament_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A generous sanity cap, explicitly NOT a real tennis best-of-3/5 format
-- rule, matching competition_match_sets_range's exact precedent.
ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_match_sets_range"
    CHECK (
        ("sets_won_a" IS NULL OR "sets_won_a" BETWEEN 0 AND 5)
        AND ("sets_won_b" IS NULL OR "sets_won_b" BETWEEN 0 AND 5)
    );
ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_match_winner_participant_valid"
    CHECK (
        "winner_participant_id" IS NULL
        OR "winner_participant_id" = "participant_a_id"
        OR "winner_participant_id" = "participant_b_id"
    );

CREATE UNIQUE INDEX "tournament_matches_tournament_round_slot_unique"
    ON "tournament_matches" ("tournament_id", "round", "slot");
-- Bracket-read hot path.
CREATE INDEX "tournament_matches_tournament_round_idx" ON "tournament_matches" ("tournament_id", "round");
