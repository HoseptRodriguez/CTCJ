# ADR-0002: VARCHAR + CHECK instead of native Postgres ENUM

## Context

Several columns are closed sets of string values: `users.status`,
`roles.code`, `reservations.status`, `reservations.reservation_type`, etc.
Postgres offers a native `ENUM` type for this; Prisma's schema DSL maps its
own `enum` keyword directly to that native type.

This decision is ported from the prior Spring Boot prototype ("v7"), which
made the same choice for the same reason — restated here because it's a
real, non-obvious tradeoff worth documenting on its own merits, not just
inherited.

## Decision

Model these columns as `VARCHAR(n) + CHECK (col IN (...))` in the Prisma
schema (plain `String`, not Prisma's `enum`), with the allowed values also
exported as frozen JS objects from `packages/shared` (e.g.
`RESERVATION_STATUS.HOLD`) for editor autocomplete and Zod validation at the
API boundary.

## Why not native ENUM

Postgres native enums require a schema migration (`ALTER TYPE ... ADD
VALUE`, historically not transaction-safe in older Postgres versions, and
still awkward to remove a value from) every time a new status/type value is
added. For young, evolving domains like competition formats or reservation
types, that friction is a real cost with no compensating benefit — `CHECK`
constraint changes are a normal, reversible migration.

## Consequences

- No native DB-level autocomplete/type safety on these columns — mitigated
  by the `packages/shared` constants + Zod schemas, which reject invalid
  values before they'd ever reach the DB.
- Adding a new status/type value is: update the `CHECK` constraint (one
  migration line), update the `packages/shared` constant, done — no
  Prisma `enum` regeneration, no native type churn.
