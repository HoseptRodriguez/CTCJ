-- Challenge Match Score Confirmation ------------------------------------
-- Both players self-report a score for an ACCEPTED challenge; only once
-- both entries agree does it become a real, staff-visible
-- competition_matches row (competition's existing standings/match-history/
-- activity-feed surfaces then pick it up for free -- no changes needed
-- there). A mismatch just leaves the challenge ACCEPTED so either player
-- can resubmit.

-- Challenge gains a terminal COMPLETED status, set once the result above
-- is confirmed -- lets the UI stop showing an ACCEPTED challenge in the
-- "needs a score" list without joining against challenge_match_results.
ALTER TABLE "challenges" ADD COLUMN "completed_at" TIMESTAMP(3);

ALTER TABLE "challenges" DROP CONSTRAINT "challenge_status_valid";
ALTER TABLE "challenges" ADD CONSTRAINT "challenge_status_valid"
    CHECK ("status" IN ('PENDING','ACCEPTED','REJECTED','CANCELLED','COMPLETED'));

ALTER TABLE "challenges" ADD CONSTRAINT "challenge_completed_coherent"
    CHECK (("status" = 'COMPLETED') = ("completed_at" IS NOT NULL));

-- ChallengeMatchResult -----------------------------------------------------
-- 1:1 with a challenge, created lazily on first score submission (no
-- placeholder row for every ACCEPTED challenge). Each side's submission is
-- stored independently in the SAME fixed frame competition_matches itself
-- uses -- sets_won_a/sets_won_b always mean A=challenger, B=opponent,
-- regardless of which of the two players submitted it (the application
-- layer translates "my sets/their sets" into this frame before persisting)
-- -- so comparing the two submissions for agreement is a straight column
-- comparison, not a role-aware one. winner_side is deliberately NOT
-- stored: it's derived from sets_won_a vs sets_won_b, one less thing the
-- two submissions would otherwise have to agree on redundantly.
CREATE TABLE "challenge_match_results" (
    "id"                      UUID NOT NULL DEFAULT gen_random_uuid(),
    "challenge_id"            UUID NOT NULL,
    "status"                  VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING|CONFIRMED

    "challenger_category"        VARCHAR(20), -- SEGUNDA|TERCERA|CUARTA|QUINTA
    "challenger_sets_won_a"      SMALLINT,
    "challenger_sets_won_b"      SMALLINT,
    "challenger_played_at"       DATE,
    "challenger_submitted_at"    TIMESTAMP(3),

    "opponent_category"          VARCHAR(20),
    "opponent_sets_won_a"        SMALLINT,
    "opponent_sets_won_b"        SMALLINT,
    "opponent_played_at"         DATE,
    "opponent_submitted_at"      TIMESTAMP(3),

    "competition_match_id"   UUID,           -- set once CONFIRMED
    "confirmed_at"            TIMESTAMP(3),
    "created_at"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "challenge_match_results_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "challenge_match_results" ADD CONSTRAINT "challenge_match_results_challenge_id_fkey"
    FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- No standalone value once the parent challenge is gone -- same reasoning
-- as challenges' own two FKs to users (challenges_challenger_user_id_fkey
-- etc.), and nothing in this app ever deletes a challenge anyway.

ALTER TABLE "challenge_match_results" ADD CONSTRAINT "challenge_match_results_competition_match_id_fkey"
    FOREIGN KEY ("competition_match_id") REFERENCES "competition_matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- RESTRICT, mirroring competition_matches_season_id_fkey's own precedent --
-- there's no use case that deletes a competition_matches row (only void).

-- 1:1 with challenge.
CREATE UNIQUE INDEX "challenge_match_results_challenge_id_unique"
    ON "challenge_match_results" ("challenge_id");

ALTER TABLE "challenge_match_results" ADD CONSTRAINT "challenge_match_result_status_valid"
    CHECK ("status" IN ('PENDING', 'CONFIRMED'));

ALTER TABLE "challenge_match_results" ADD CONSTRAINT "challenge_match_result_challenger_category_valid"
    CHECK ("challenger_category" IS NULL OR "challenger_category" IN ('SEGUNDA', 'TERCERA', 'CUARTA', 'QUINTA'));
ALTER TABLE "challenge_match_results" ADD CONSTRAINT "challenge_match_result_opponent_category_valid"
    CHECK ("opponent_category" IS NULL OR "opponent_category" IN ('SEGUNDA', 'TERCERA', 'CUARTA', 'QUINTA'));

-- A generous sanity cap, matching competition_match_sets_range's own
-- explicitly-not-a-real-format reasoning.
ALTER TABLE "challenge_match_results" ADD CONSTRAINT "challenge_match_result_challenger_sets_range"
    CHECK (
        ("challenger_sets_won_a" IS NULL AND "challenger_sets_won_b" IS NULL)
        OR ("challenger_sets_won_a" BETWEEN 0 AND 5 AND "challenger_sets_won_b" BETWEEN 0 AND 5)
    );
ALTER TABLE "challenge_match_results" ADD CONSTRAINT "challenge_match_result_opponent_sets_range"
    CHECK (
        ("opponent_sets_won_a" IS NULL AND "opponent_sets_won_b" IS NULL)
        OR ("opponent_sets_won_a" BETWEEN 0 AND 5 AND "opponent_sets_won_b" BETWEEN 0 AND 5)
    );

-- No tie per submission (the application layer also rejects this before
-- ever reaching here -- see ChallengeMatchResult.submit's InvalidScoreSubmission
-- -- this is a DB-level backstop, matching competition_match_winner_coherent's
-- own belt-and-suspenders role).
ALTER TABLE "challenge_match_results" ADD CONSTRAINT "challenge_match_result_challenger_no_tie"
    CHECK ("challenger_sets_won_a" IS NULL OR "challenger_sets_won_a" <> "challenger_sets_won_b");
ALTER TABLE "challenge_match_results" ADD CONSTRAINT "challenge_match_result_opponent_no_tie"
    CHECK ("opponent_sets_won_a" IS NULL OR "opponent_sets_won_a" <> "opponent_sets_won_b");

ALTER TABLE "challenge_match_results" ADD CONSTRAINT "challenge_match_result_confirmed_coherent"
    CHECK (
        ("status" = 'CONFIRMED' AND "confirmed_at" IS NOT NULL AND "competition_match_id" IS NOT NULL)
        OR ("status" != 'CONFIRMED' AND "confirmed_at" IS NULL AND "competition_match_id" IS NULL)
    );
