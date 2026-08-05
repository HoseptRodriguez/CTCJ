-- Competition (Internal Rankings, Phase 12) -----------------------------------
-- Staff-recorded match results + standings computed live from them at read
-- time (never stored). Mirrors booking's "cobro asistido": staff-only
-- recording, no player self-report/dispute flow. Tournament brackets/draws
-- are a separate future phase -- this is only a ranking ladder.

-- CompetitionSeason -----------------------------------------------------------
CREATE TABLE "competition_seasons" (
    "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
    "club_id"       UUID NOT NULL,
    "name"          VARCHAR(60) NOT NULL,
    "year"          SMALLINT NOT NULL,
    "season_number" SMALLINT NOT NULL,             -- 1|2 -- two seasons/year
    "status"        VARCHAR(10) NOT NULL DEFAULT 'OPEN', -- OPEN|CLOSED
    "start_date"    DATE NOT NULL,
    "end_date"      DATE,
    "created_by"    UUID NOT NULL,                 -- no FK, audit-only
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at"     TIMESTAMP(3),
    "closed_by"     UUID,                          -- no FK, audit-only

    CONSTRAINT "competition_seasons_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "competition_seasons" ADD CONSTRAINT "competition_seasons_club_id_fkey"
    FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "competition_seasons" ADD CONSTRAINT "competition_season_status_valid"
    CHECK ("status" IN ('OPEN', 'CLOSED'));
ALTER TABLE "competition_seasons" ADD CONSTRAINT "competition_season_number_valid"
    CHECK ("season_number" IN (1, 2));
ALTER TABLE "competition_seasons" ADD CONSTRAINT "competition_season_closed_coherent"
    CHECK (
        ("status" = 'CLOSED' AND "closed_at" IS NOT NULL AND "closed_by" IS NOT NULL)
        OR ("status" != 'CLOSED' AND "closed_at" IS NULL AND "closed_by" IS NULL)
    );

CREATE UNIQUE INDEX "competition_seasons_club_year_number_unique"
    ON "competition_seasons" ("club_id", "year", "season_number");

-- At most one OPEN season per club at a time.
CREATE UNIQUE INDEX "competition_seasons_one_open"
    ON "competition_seasons" ("club_id") WHERE "status" = 'OPEN';

-- CompetitionMatch --------------------------------------------------------------
-- A match result, recorded by staff after the fact -- never edited, only
-- voided (a compensating action, matching invoice_cancelled_coherent's
-- precedent, not a mutation). No club_id here -- reached via
-- season_id -> competition_seasons.club_id, matching coach_notes'/
-- performance_ratings' precedent of not duplicating club_id on records
-- that are dependent on another entity rather than club-wide config.
CREATE TABLE "competition_matches" (
    "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
    "season_id"   UUID NOT NULL,
    "category"    VARCHAR(20) NOT NULL,            -- SEGUNDA|TERCERA|CUARTA|QUINTA -- no PRIMERA
    "modality"    VARCHAR(10) NOT NULL,             -- SINGLES|DOBLES
    "status"      VARCHAR(10) NOT NULL DEFAULT 'RECORDED', -- RECORDED|VOID
    "winner_side" VARCHAR(1) NOT NULL,               -- A|B
    "sets_won_a"  SMALLINT NOT NULL,
    "sets_won_b"  SMALLINT NOT NULL,
    "played_at"   DATE NOT NULL,
    "notes"       TEXT,
    "recorded_by" UUID NOT NULL,                     -- no FK, audit-only
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voided_at"   TIMESTAMP(3),
    "voided_by"   UUID,                              -- no FK, audit-only
    "void_reason" TEXT,

    CONSTRAINT "competition_matches_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "competition_matches" ADD CONSTRAINT "competition_matches_season_id_fkey"
    FOREIGN KEY ("season_id") REFERENCES "competition_seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "competition_matches" ADD CONSTRAINT "competition_match_category_valid"
    CHECK ("category" IN ('SEGUNDA', 'TERCERA', 'CUARTA', 'QUINTA'));
ALTER TABLE "competition_matches" ADD CONSTRAINT "competition_match_modality_valid"
    CHECK ("modality" IN ('SINGLES', 'DOBLES'));
ALTER TABLE "competition_matches" ADD CONSTRAINT "competition_match_status_valid"
    CHECK ("status" IN ('RECORDED', 'VOID'));

-- Self-enforcing: also implicitly rejects any winner_side other than A/B,
-- since neither branch would be true for a third value.
ALTER TABLE "competition_matches" ADD CONSTRAINT "competition_match_winner_coherent"
    CHECK (
        ("winner_side" = 'A' AND "sets_won_a" > "sets_won_b")
        OR ("winner_side" = 'B' AND "sets_won_b" > "sets_won_a")
    );
-- A generous sanity cap, explicitly NOT a real tennis best-of-3/5 format
-- rule -- not specified in the source doc, nothing narrower invented.
ALTER TABLE "competition_matches" ADD CONSTRAINT "competition_match_sets_range"
    CHECK ("sets_won_a" BETWEEN 0 AND 5 AND "sets_won_b" BETWEEN 0 AND 5);

ALTER TABLE "competition_matches" ADD CONSTRAINT "competition_match_void_coherent"
    CHECK (
        ("status" = 'VOID' AND "voided_at" IS NOT NULL AND "voided_by" IS NOT NULL)
        OR ("status" != 'VOID' AND "voided_at" IS NULL AND "voided_by" IS NULL)
    );

-- Standings-computation hot path: filter matches by season+category+modality
-- (and status, to exclude VOID rows) in one index.
CREATE INDEX "competition_matches_standings_idx"
    ON "competition_matches" ("season_id", "category", "modality", "status");

-- CompetitionMatchParticipant -----------------------------------------------
CREATE TABLE "competition_match_participants" (
    "id"        UUID NOT NULL DEFAULT gen_random_uuid(),
    "match_id"  UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "side"      VARCHAR(1) NOT NULL,                -- A|B

    CONSTRAINT "competition_match_participants_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "competition_match_participants" ADD CONSTRAINT "competition_match_participants_match_id_fkey"
    FOREIGN KEY ("match_id") REFERENCES "competition_matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "competition_match_participants" ADD CONSTRAINT "competition_match_participants_player_id_fkey"
    FOREIGN KEY ("player_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "competition_match_participants" ADD CONSTRAINT "competition_match_participants_side_valid"
    CHECK ("side" IN ('A', 'B'));

-- No player appears twice in the same match.
CREATE UNIQUE INDEX "competition_match_participants_match_player_unique"
    ON "competition_match_participants" ("match_id", "player_id");

-- "All matches player X played" hot path (standings computation, match history).
CREATE INDEX "competition_match_participants_player_idx"
    ON "competition_match_participants" ("player_id");
