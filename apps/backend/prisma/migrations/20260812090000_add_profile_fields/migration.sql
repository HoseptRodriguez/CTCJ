-- Player Profile (Phase 2): a short self-written bio and an avatar image
-- URL. `phone`/`birth_date` already exist on `users` from the very first
-- migration but were never exposed by the domain layer -- no schema change
-- needed for those, just wiring (see User.js/prismaUserRepository.js).
ALTER TABLE "users" ADD COLUMN "bio" TEXT;
ALTER TABLE "users" ADD COLUMN "avatar_url" VARCHAR(255);
