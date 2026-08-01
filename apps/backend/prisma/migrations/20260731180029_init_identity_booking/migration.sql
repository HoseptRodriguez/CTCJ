-- ============================================================================
-- Extensions (must precede any table using gen_random_uuid()/citext/gist)
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS citext;

-- CreateTable
CREATE TABLE "clubs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(60) NOT NULL,
    "legal_name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Bogota',
    "currency" CHAR(3) NOT NULL DEFAULT 'COP',
    "country_code" CHAR(2) NOT NULL DEFAULT 'CO',
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "address" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "club_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" VARCHAR(255),
    "first_name" VARCHAR(80) NOT NULL,
    "last_name" VARCHAR(80) NOT NULL,
    "document_type" VARCHAR(10),
    "document_number" TEXT,
    "phone" TEXT,
    "birth_date" DATE,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "email_verified_at" TIMESTAMP(3),
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "mfa_secret" TEXT,
    "failed_login_count" SMALLINT NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "accepted_terms_at" TIMESTAMP(3),
    "accepted_privacy_at" TIMESTAMP(3),
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(40) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT true,
    "self_assignable" BOOLEAN NOT NULL DEFAULT false,
    "requires_mfa" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(80) NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "is_sensitive" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "granted_by" UUID,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_by" UUID,
    "revoked_at" TIMESTAMP(3),
    "reason" TEXT,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "family_id" UUID NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "replaced_by" UUID,
    "ip_address" TEXT,
    "user_agent" TEXT,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_resets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "requested_ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "club_id" UUID NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updated_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "aggregate_type" TEXT NOT NULL,
    "aggregate_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "attempts" SMALLINT NOT NULL DEFAULT 0,
    "last_error" TEXT,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "club_id" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "surface" VARCHAR(30) NOT NULL DEFAULT 'CLAY',
    "has_lighting" BOOLEAN NOT NULL DEFAULT false,
    "default_price_cop" BIGINT,
    "display_order" SMALLINT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "club_id" UUID NOT NULL,
    "court_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "reservation_type" VARCHAR(20) NOT NULL DEFAULT 'PRIVATE',
    "holder_user_id" UUID,
    "created_by" UUID NOT NULL,
    "hold_expires_at" TIMESTAMP(3),
    "price_cop" BIGINT,
    "payment_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shedlock" (
    "name" VARCHAR(64) NOT NULL,
    "lock_until" TIMESTAMP(3) NOT NULL,
    "locked_at" TIMESTAMP(3) NOT NULL,
    "locked_by" TEXT NOT NULL,

    CONSTRAINT "shedlock_pkey" PRIMARY KEY ("name")
);

-- CreateIndex
CREATE UNIQUE INDEX "clubs_slug_key" ON "clubs"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_club_id_email_key" ON "users"("club_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_replaced_by_key" ON "refresh_tokens"("replaced_by");

-- CreateIndex
CREATE UNIQUE INDEX "email_verifications_token_hash_key" ON "email_verifications"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "password_resets_token_hash_key" ON "password_resets"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_club_id_key_key" ON "system_settings"("club_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "courts_club_id_name_key" ON "courts"("club_id", "name");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_revoked_by_fkey" FOREIGN KEY ("revoked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_replaced_by_fkey" FOREIGN KEY ("replaced_by") REFERENCES "refresh_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verifications" ADD CONSTRAINT "email_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courts" ADD CONSTRAINT "courts_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_court_id_fkey" FOREIGN KEY ("court_id") REFERENCES "courts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_holder_user_id_fkey" FOREIGN KEY ("holder_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- Hand-written additions below: everything Prisma's schema DSL cannot express
-- natively (citext, partial indexes, CHECK constraints, a view, a partitioned
-- table, and a range-type exclusion constraint). See docs/adr and the Phase 1
-- plan for the rationale behind each.
-- ============================================================================

-- --- citext for case-insensitive email -------------------------------------
ALTER TABLE "users" ALTER COLUMN "email" TYPE CITEXT;
ALTER TABLE "clubs" ALTER COLUMN "contact_email" TYPE CITEXT;

-- --- users: partial indexes (v7 V1) -----------------------------------------
CREATE INDEX "users_club_status_active_idx" ON "users" ("club_id", "status") WHERE "deleted_at" IS NULL;
CREATE INDEX "users_club_document_idx" ON "users" ("club_id", "document_number") WHERE "document_number" IS NOT NULL;

-- --- user_roles: one active role per (user, role); revocation coherence ----
CREATE UNIQUE INDEX "user_roles_active_unique" ON "user_roles" ("user_id", "role_id") WHERE "revoked_at" IS NULL;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_revocation_coherence"
    CHECK (("revoked_at" IS NULL) = ("revoked_by" IS NULL));
CREATE INDEX "user_roles_active_by_user_idx" ON "user_roles" ("user_id") WHERE "revoked_at" IS NULL;

-- --- refresh_tokens: coherence + lookup indexes -----------------------------
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_expiry_after_issue"
    CHECK ("expires_at" > "issued_at");
CREATE INDEX "refresh_tokens_active_by_user_idx" ON "refresh_tokens" ("user_id") WHERE "revoked_at" IS NULL;
CREATE INDEX "refresh_tokens_family_idx" ON "refresh_tokens" ("family_id");

-- --- password_resets: active-request lookup ---------------------------------
CREATE INDEX "password_resets_active_by_user_idx" ON "password_resets" ("user_id") WHERE "consumed_at" IS NULL;

-- --- user_roles_view: read-model of currently active roles -----------------
-- Not modeled in schema.prisma (Prisma has no first-class view DSL used
-- here) -- accessed via prisma.$queryRaw from a dedicated infra adapter.
CREATE VIEW "user_roles_view" AS
    SELECT ur."user_id", r."code" AS "role_code"
    FROM "user_roles" ur
    JOIN "roles" r ON r."id" = ur."role_id"
    WHERE ur."revoked_at" IS NULL;

-- --- audit_logs: hand-written partitioned, append-only table ---------------
-- Not modeled in schema.prisma (composite PK + native partitioning have no
-- Prisma DSL equivalent) -- written/read via prisma.$executeRaw/$queryRaw.
CREATE TABLE "audit_logs" (
    "id"            BIGINT GENERATED ALWAYS AS IDENTITY,
    "occurred_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
    "club_id"       UUID,
    "actor_user_id" UUID,
    "actor_roles"   TEXT[],
    "action"        VARCHAR(60) NOT NULL,
    "entity_type"   VARCHAR(60) NOT NULL,
    "entity_id"     UUID,
    "before_state"  JSONB,
    "after_state"   JSONB,
    "ip_address"    INET,
    "user_agent"    TEXT,
    "justification" TEXT,
    PRIMARY KEY ("id", "occurred_at")
) PARTITION BY RANGE ("occurred_at");

CREATE TABLE "audit_logs_default" PARTITION OF "audit_logs" DEFAULT;
CREATE TABLE "audit_logs_2026_07" PARTITION OF "audit_logs"
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE "audit_logs_2026_08" PARTITION OF "audit_logs"
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE "audit_logs_2026_09" PARTITION OF "audit_logs"
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" ("actor_user_id", "occurred_at" DESC);
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" ("entity_type", "entity_id", "occurred_at" DESC);
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" ("action", "occurred_at" DESC);

-- NOTE: creating next month's partition ahead of time is a manual/cron
-- operational step in Phase 1 (see apps/backend/scripts/createAuditPartition.js);
-- automating it is deferred until a job scheduler exists for other reasons.

-- --- outbox_events: unprocessed lookup --------------------------------------
CREATE INDEX "outbox_events_unprocessed_idx" ON "outbox_events" ("occurred_at") WHERE "processed_at" IS NULL;

-- --- reservations: range period + structural double-booking prevention -----
ALTER TABLE "reservations" ADD COLUMN "period" TSTZRANGE;
UPDATE "reservations" SET "period" = tstzrange("created_at", "created_at", '[)') WHERE "period" IS NULL;
ALTER TABLE "reservations" ALTER COLUMN "period" SET NOT NULL;

ALTER TABLE "reservations" ADD COLUMN "period_start" TIMESTAMPTZ GENERATED ALWAYS AS (lower("period")) STORED;
ALTER TABLE "reservations" ADD COLUMN "period_end" TIMESTAMPTZ GENERATED ALWAYS AS (upper("period")) STORED;

ALTER TABLE "reservations" ADD CONSTRAINT "reservation_status_valid"
    CHECK ("status" IN ('HOLD','CONFIRMED','CANCELLED','EXPIRED','NO_SHOW','COMPLETED'));
ALTER TABLE "reservations" ADD CONSTRAINT "reservation_type_valid"
    CHECK ("reservation_type" IN ('PRIVATE','CLASS','TOURNAMENT','MAINTENANCE','BLOCKED'));
ALTER TABLE "reservations" ADD CONSTRAINT "hold_requires_expiry"
    CHECK ("status" <> 'HOLD' OR "hold_expires_at" IS NOT NULL);

-- The mechanism that makes double-booking structurally impossible: two
-- HOLD/CONFIRMED reservations on the same court can never have overlapping
-- periods, enforced by Postgres itself (not application code).
ALTER TABLE "reservations" ADD CONSTRAINT "reservation_no_overlap"
    EXCLUDE USING gist (
        "court_id" WITH =,
        "period" WITH &&
    ) WHERE ("status" IN ('HOLD','CONFIRMED'));

CREATE INDEX "reservations_court_period_gist_idx" ON "reservations" USING gist ("court_id", "period");
CREATE INDEX "reservations_holder_status_idx" ON "reservations" ("holder_user_id", "status") WHERE "holder_user_id" IS NOT NULL;
CREATE INDEX "reservations_hold_expiry_idx" ON "reservations" ("hold_expires_at") WHERE "status" = 'HOLD';
