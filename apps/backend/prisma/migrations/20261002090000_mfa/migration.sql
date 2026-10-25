-- Two-step verification (MFA) for the staff (2026-10-02).
--   * users.mfa_enabled / mfa_secret already exist; mfa_secret now holds
--     the TOTP secret ENCRYPTED (AES-256-GCM, key MFA_ENCRYPTION_KEY).
--   * New optional columns: when it was turned on, failed attempts and the
--     temporary lock, and the last time step used (a code can't be reused).
--   * mfa_recovery_codes: 10 one-time codes per person, stored only as a
--     keyed hash (HMAC-SHA256), never in the clear.
--   * Only adds optional columns, a table and indexes: no existing data changes.

ALTER TABLE "users" ADD COLUMN "mfa_enabled_at" TIMESTAMPTZ;
ALTER TABLE "users" ADD COLUMN "mfa_failed_count" SMALLINT;
ALTER TABLE "users" ADD COLUMN "mfa_locked_until" TIMESTAMPTZ;
ALTER TABLE "users" ADD COLUMN "mfa_last_step" BIGINT;

CREATE TABLE "mfa_recovery_codes" (
    "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id"    UUID NOT NULL,
    "code_hash"  VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "used_at"    TIMESTAMPTZ,

    CONSTRAINT "mfa_recovery_codes_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "mfa_recovery_codes" ADD CONSTRAINT "mfa_recovery_codes_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "mfa_recovery_codes_user_hash_key" ON "mfa_recovery_codes" ("user_id", "code_hash");
CREATE INDEX "mfa_recovery_codes_unused_idx" ON "mfa_recovery_codes" ("user_id") WHERE "used_at" IS NULL;
