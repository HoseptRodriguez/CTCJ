-- MembershipPlan -----------------------------------------------------------
CREATE TABLE "membership_plans" (
    "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
    "club_id"     UUID NOT NULL,
    "code"        VARCHAR(40) NOT NULL,
    "name"        VARCHAR(120) NOT NULL,
    "description" TEXT,
    "is_active"   BOOLEAN NOT NULL DEFAULT true,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_plans_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "membership_plans" ADD CONSTRAINT "membership_plans_club_id_fkey"
    FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "membership_plans_club_code_unique" ON "membership_plans" ("club_id", "code");
CREATE INDEX "membership_plans_active_idx" ON "membership_plans" ("club_id") WHERE "is_active" = true;

-- MembershipPlanPrice ---------------------------------------------------------
CREATE TABLE "membership_plan_prices" (
    "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
    "plan_id"        UUID NOT NULL,
    "base_price_cop" BIGINT NOT NULL,
    "valid_from"     DATE NOT NULL,
    "valid_to"       DATE,                 -- NULL = vigente (current)
    "created_by"     UUID NOT NULL,        -- no FK, audit-only -- matches Payment.recordedBy precedent
    "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_plan_prices_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "membership_plan_prices" ADD CONSTRAINT "membership_plan_prices_plan_id_fkey"
    FOREIGN KEY ("plan_id") REFERENCES "membership_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "membership_plan_prices" ADD CONSTRAINT "membership_plan_price_non_negative"
    CHECK ("base_price_cop" >= 0);
ALTER TABLE "membership_plan_prices" ADD CONSTRAINT "membership_plan_price_period_valid"
    CHECK ("valid_to" IS NULL OR "valid_to" > "valid_from");

-- At most one open-ended ("vigente") price per plan at a time.
CREATE UNIQUE INDEX "membership_plan_prices_vigente_unique"
    ON "membership_plan_prices" ("plan_id") WHERE "valid_to" IS NULL;

CREATE INDEX "membership_plan_prices_plan_idx" ON "membership_plan_prices" ("plan_id");

-- PlayerMembership (table: memberships) --------------------------------------
-- player_id references users(id), not players(id) as the club's own docs
-- literally say -- this codebase has no `players` table; JUGADOR is a role
-- granted on `users`. Deliberate deviation, not an oversight.
CREATE TABLE "memberships" (
    "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
    "player_id"    UUID NOT NULL,
    "plan_id"      UUID NOT NULL,
    "start_date"   DATE NOT NULL,
    "end_date"     DATE,
    "billing_day"  SMALLINT NOT NULL,
    "frequency"    VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
    "status"       VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "memberships" ADD CONSTRAINT "memberships_player_id_fkey"
    FOREIGN KEY ("player_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_plan_id_fkey"
    FOREIGN KEY ("plan_id") REFERENCES "membership_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "memberships" ADD CONSTRAINT "membership_status_valid"
    CHECK ("status" IN ('ACTIVE','SUSPENDED','ENDED'));
ALTER TABLE "memberships" ADD CONSTRAINT "membership_billing_day_valid"
    CHECK ("billing_day" BETWEEN 1 AND 28);
ALTER TABLE "memberships" ADD CONSTRAINT "membership_period_valid"
    CHECK ("end_date" IS NULL OR "end_date" > "start_date");

CREATE INDEX "memberships_player_idx" ON "memberships" ("player_id");
CREATE INDEX "memberships_plan_idx" ON "memberships" ("plan_id");
CREATE INDEX "memberships_status_idx" ON "memberships" ("status") WHERE "status" = 'ACTIVE';

-- MembershipAdjustment --------------------------------------------------------
CREATE TABLE "membership_adjustments" (
    "id"              UUID NOT NULL DEFAULT gen_random_uuid(),
    "membership_id"   UUID NOT NULL,
    "adjustment_type" VARCHAR(20) NOT NULL,
    "value"           NUMERIC(12,2) NOT NULL,
    "reason"          TEXT NOT NULL,
    "valid_from"      DATE NOT NULL,
    "valid_to"        DATE,
    "authorized_by"   UUID NOT NULL,       -- no FK, audit-only
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_adjustments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "membership_adjustments" ADD CONSTRAINT "membership_adjustments_membership_id_fkey"
    FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "membership_adjustments" ADD CONSTRAINT "membership_adjustment_type_valid"
    CHECK ("adjustment_type" IN ('DISCOUNT_PCT','DISCOUNT_ABS','SCHOLARSHIP','SURCHARGE','CUSTOM_PRICE'));
ALTER TABLE "membership_adjustments" ADD CONSTRAINT "membership_adjustment_period_valid"
    CHECK ("valid_to" IS NULL OR "valid_to" > "valid_from");

CREATE INDEX "membership_adjustments_membership_idx" ON "membership_adjustments" ("membership_id");
