# ADR-0003: `club_id` on every root table from day one ("latent multitenancy")

## Context

CTCJ is currently a single club. The user's own requirements explicitly list
"Multi-Club Support (SaaS)" as a future feature. This decision is ported
from the prior Spring Boot prototype ("v7"), which made the same call —
restated here because it directly shapes every migration going forward.

## Decision

Every root/aggregate table (`users`, `courts`, `reservations`,
`system_settings`, ...) carries a `club_id UUID` foreign key from the first
migration, even though exactly one club (`ctcj`, seeded in
`prisma/seed.js`) exists today. `DEFAULT_CLUB_ID` in
`apps/backend/src/config/club.js` is the single place that hardcodes it.

## Alternatives considered

- **Add `club_id` later, when multi-club is actually needed**: rejected.
  Retrofitting a tenant column onto tables with existing data and
  established unique constraints (e.g. `users(email)` would need to become
  `users(club_id, email)`) is a genuinely risky migration on a live system.
  Adding the column now, while every table is empty, costs nothing.

## Consequences

- Uniqueness constraints are already scoped correctly (e.g.
  `@@unique([clubId, email])` on `User`, not a bare `email` unique index),
  so they won't need to change shape later.
- A future multi-club pivot becomes: stop hardcoding `DEFAULT_CLUB_ID`, add
  club-selection/resolution logic (subdomain, path prefix, or user
  membership), and backfill is unnecessary since the column has been
  populated correctly since day one.
- Until that pivot, `DEFAULT_CLUB_ID` is intentionally the only place this
  single-club assumption lives.
