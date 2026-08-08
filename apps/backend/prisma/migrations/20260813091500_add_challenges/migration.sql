-- Challenge (Phase 3a) ----------------------------------------------------
-- Player-to-player: one player proposes a friendly match, the other
-- accepts/rejects. Two named FKs to users, mirroring guardianships' exact
-- precedent. Both CASCADE, not RESTRICT like goals'/coach_notes' -- a
-- challenge has no standalone value once either party is gone.
CREATE TABLE "challenges" (
    "id"                  UUID NOT NULL DEFAULT gen_random_uuid(),
    "challenger_user_id"  UUID NOT NULL,
    "opponent_user_id"    UUID NOT NULL,
    "message"             VARCHAR(500),
    "status"              VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING|ACCEPTED|REJECTED|CANCELLED
    "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at"        TIMESTAMP(3),

    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "challenges" ADD CONSTRAINT "challenges_challenger_user_id_fkey"
    FOREIGN KEY ("challenger_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_opponent_user_id_fkey"
    FOREIGN KEY ("opponent_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "challenges" ADD CONSTRAINT "challenge_status_valid"
    CHECK ("status" IN ('PENDING','ACCEPTED','REJECTED','CANCELLED'));
ALTER TABLE "challenges" ADD CONSTRAINT "challenge_no_self_challenge"
    CHECK ("challenger_user_id" <> "opponent_user_id");
ALTER TABLE "challenges" ADD CONSTRAINT "challenge_response_coherence"
    CHECK (("status" = 'PENDING') = ("responded_at" IS NULL));

-- DB-level backstop against duplicate spam in one direction -- the
-- application layer checks both directions before creating (see
-- createChallenge.js's findActiveBetween), mirroring guardianships'
-- active-pair precedent.
CREATE UNIQUE INDEX "challenges_pending_pair_unique"
    ON "challenges" ("challenger_user_id", "opponent_user_id")
    WHERE "status" = 'PENDING';

CREATE INDEX "challenges_challenger_idx" ON "challenges" ("challenger_user_id");
CREATE INDEX "challenges_opponent_idx" ON "challenges" ("opponent_user_id");
