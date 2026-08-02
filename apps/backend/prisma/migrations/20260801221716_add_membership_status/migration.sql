-- AlterTable
ALTER TABLE "users" ADD COLUMN "membership_status" VARCHAR(20);
ALTER TABLE "users" ADD COLUMN "membership_status_updated_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "membership_status_updated_by" UUID;

ALTER TABLE "users" ADD CONSTRAINT "membership_status_valid"
    CHECK ("membership_status" IS NULL OR "membership_status" IN ('ACTIVE','PENDING','OVERDUE','INACTIVE','SUSPENDED'));
