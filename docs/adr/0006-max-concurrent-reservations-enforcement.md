# ADR-0006: Max-concurrent-reservations-per-player enforced at the application layer

## Context

The platform caps each player at 2 concurrent active (HOLD or CONFIRMED) reservations at a time -- a new rule not present in the ported v7 design, locked in during Phase 2 planning. Unlike double-booking prevention (a cross-user safety invariant, enforced structurally by a Postgres `EXCLUDE` constraint), this is a per-player self-imposed limit.

## Decision

Enforce the cap in `createHold`'s application-layer use case via `ReservationRepository.countOccupyingByHolder(userId)`, using the existing partial index `reservations_holder_status_idx` -- no new schema or constraint added.

## Why not a DB-level constraint

A pure application-level check-then-insert has a narrow TOCTOU race: two near-simultaneous hold requests from the _same player's own session_ could both read a count below the cap before either insert commits. This is judged acceptable rather than worth a DB-level mechanism, because:

- It's a self-imposed courtesy limit, not a cross-user safety invariant. The one invariant that must never be violated under any concurrency -- two people holding the same court/time slot -- is already made structurally impossible by `reservation_no_overlap`, independent of this check.
- The worst outcome of the race is one extra HOLD beyond the cap, self-expiring within 5 minutes (the same HOLD duration that bounds every reservation), with no data corruption and no impact on any other player.
- It requires two near-simultaneous requests from the same authenticated session -- a narrow window a player gains nothing from forcing against their own limit.

## Mitigation included anyway

The count-check and insert run inside one transaction guarded by `pg_advisory_xact_lock(hashtext(holderUserId))`, serializing concurrent attempts by the same player at the cost of one extra round trip. This closes the race almost entirely for one line of SQL, without the schema complexity a hard constraint (e.g. a partial unique index or trigger counting active rows per user) would add for a rule this soft.

## Consequences

If a future rule needs a genuinely hard per-player cap (e.g. a paid-tier enforcement with real financial stakes), revisit with a stronger mechanism at that point -- this decision is scoped to the current courtesy-limit semantics, not a precedent for skipping DB-level enforcement generally.
