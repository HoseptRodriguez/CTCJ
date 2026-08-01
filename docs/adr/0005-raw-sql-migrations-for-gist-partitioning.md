# ADR-0005: Raw-SQL migration additions for features Prisma can't express

## Context

Several pieces of the ported schema design have no representation in
Prisma's schema DSL:

- `citext` (case-insensitive email) — no native Prisma scalar.
- Partial indexes (e.g. `users(club_id, status) WHERE deleted_at IS NULL`)
  — no partial-index syntax in Prisma.
- `CHECK` constraints beyond simple field-level validation (e.g.
  cross-column revocation coherence on `user_roles`) — no DSL for
  multi-column checks.
- `EXCLUDE USING gist` on `reservations` — the mechanism that makes
  double-booking structurally impossible at the database level. No
  exclusion-constraint or range-type (`tstzrange`) support in Prisma.
- `audit_logs` as a native `PARTITION BY RANGE` table with a composite
  primary key — no partitioning DSL in Prisma.
- `user_roles_view` — a plain SQL view exposing only currently-active role
  grants, used instead of re-deriving "active roles" client-side.

## Decision

Generate each migration with `prisma migrate dev --create-only`, then
hand-edit the generated `migration.sql` to add the statements above,
keeping everything in the same tracked migration file so `prisma migrate
deploy` applies it correctly in every environment (dev, CI, production).

For `reservations.period`/`period_start`/`period_end`, the Prisma schema
still declares them (`Unsupported("tstzrange")` and two generated-column
`DateTime` fields) specifically so Prisma's own migrate-diff logic stays
aware of them and doesn't propose dropping them on a future migration.
`audit_logs` and `user_roles_view` have **no** corresponding Prisma model at
all (a composite-PK partitioned table and a plain view have no clean
representation) — they're accessed exclusively via `prisma.$queryRaw` /
`prisma.$executeRaw` from dedicated infrastructure adapters.

## Consequences

- **`prisma migrate dev` must never be run casually against this schema**
  once new migrations are needed: because `audit_logs` and
  `user_roles_view` aren't modeled, Prisma's migrate-diff will see them as
  drift and may propose dropping them. Always use `--create-only` and
  hand-review/edit the generated SQL before applying, exactly as this
  migration was built. `prisma migrate deploy` (no diffing, just applies
  pending migrations) is what CI and production use, and is unaffected by
  this.
- The `reservation_no_overlap` exclusion constraint was verified against 7
  real-Postgres test cases (identical/overlapping/adjacent periods, mixed
  statuses, different courts) before any application code was written
  against it — see the manual verification transcript referenced in the
  Phase 1 plan, and `test/integration` for the automated equivalents.
- Monthly `audit_logs` partitions are currently created by hand in the
  migration (a few months ahead); creating future partitions automatically
  is deferred until a job scheduler exists for other reasons (e.g. the
  booking module's HOLD-expiry job in Phase 2).
