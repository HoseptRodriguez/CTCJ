-- Plans and prices administration (2026-09-28).
--   * membership_plans: the name is required and unique per club (ignoring
--     case and surrounding spaces). The code stays as it is: generated once
--     at creation, never edited.
--   * membership_plan_prices is already the plan price history (effective-
--     dated, append-only: a row is only ever closed, never re-priced). Prices
--     must now be above 0. plan_price_history is a read-only view over it
--     with the previous price, the new one, who changed it and when.
--   * court_price_history: courts had a single price column; every change is
--     now recorded (previous, new, who, when). A reservation keeps the price
--     it was made with (reservations.price_cop), so changes only affect new
--     reservations.
--   * notifications: new type PLAN_PRICE_CHANGED (the players of a plan are
--     told about a new price before it applies).

-- membership_plans -----------------------------------------------------------------
ALTER TABLE "membership_plans" ADD CONSTRAINT "membership_plan_name_not_blank"
    CHECK (btrim("name") <> '');
CREATE UNIQUE INDEX "membership_plans_club_name_unique"
    ON "membership_plans" ("club_id", lower(btrim("name")));

-- membership_plan_prices: above 0 --------------------------------------------------
ALTER TABLE "membership_plan_prices" DROP CONSTRAINT "membership_plan_price_non_negative";
ALTER TABLE "membership_plan_prices" ADD CONSTRAINT "membership_plan_price_positive"
    CHECK ("base_price_cop" > 0);

-- plan_price_history: one row per price, with the price it replaced ----------------
CREATE VIEW "plan_price_history" AS
SELECT p."id",
       p."plan_id",
       lag(p."base_price_cop") OVER w AS "previous_price_cop",
       p."base_price_cop"              AS "new_price_cop",
       p."valid_from"                  AS "effective_from",
       p."created_by"                  AS "changed_by",
       p."created_at"                  AS "changed_at"
  FROM "membership_plan_prices" p
WINDOW w AS (PARTITION BY p."plan_id" ORDER BY p."valid_from");

-- courts: price above 0 when set ---------------------------------------------------
ALTER TABLE "courts" ADD CONSTRAINT "court_default_price_positive"
    CHECK ("default_price_cop" IS NULL OR "default_price_cop" > 0);

-- court_price_history --------------------------------------------------------------
CREATE TABLE "court_price_history" (
    "id"                 UUID NOT NULL DEFAULT gen_random_uuid(),
    "court_id"           UUID NOT NULL,
    "previous_price_cop" BIGINT,                 -- NULL: the court had no price yet
    "new_price_cop"      BIGINT NOT NULL,
    "changed_by"         UUID NOT NULL,          -- no FK, audit-only (same as membership_plan_prices.created_by)
    "changed_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "court_price_history_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "court_price_history" ADD CONSTRAINT "court_price_history_court_id_fkey"
    FOREIGN KEY ("court_id") REFERENCES "courts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "court_price_history" ADD CONSTRAINT "court_price_history_prices_positive"
    CHECK ("new_price_cop" > 0 AND ("previous_price_cop" IS NULL OR "previous_price_cop" > 0));
CREATE INDEX "court_price_history_court_idx" ON "court_price_history" ("court_id", "changed_at" DESC);

-- notifications: PLAN_PRICE_CHANGED ------------------------------------------------
ALTER TABLE "notifications" DROP CONSTRAINT "notification_type_valid";
ALTER TABLE "notifications" ADD CONSTRAINT "notification_type_valid"
    CHECK ("type" IN (
        'CHALLENGE_RECEIVED','CHALLENGE_ACCEPTED','CHALLENGE_REJECTED','CHALLENGE_CANCELLED',
        'CHALLENGE_RESULT_SUBMITTED','CHALLENGE_RESULT_MISMATCH','CHALLENGE_RESULT_CONFIRMED',
        'POST_COMMENT_RECEIVED','PLAN_PRICE_CHANGED'
    ));
