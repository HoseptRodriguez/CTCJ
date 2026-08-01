/**
 * Fixed club identifier for this single-club deployment (seeded in prisma/seed.js).
 * Every root table already carries a club_id column (ADR-0003) so a future
 * multi-club pivot is a config change, not a schema migration.
 */
export const DEFAULT_CLUB_ID = '00000000-0000-0000-0000-000000000001';
