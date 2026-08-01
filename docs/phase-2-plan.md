# CTCJ Platform — Phase 2: Booking Module

_Approved plan, copied here from the planning session for durability. All items below are implemented — see the README for current status and `docs/adr/` for decisions made along the way._

## Context

Phase 1 delivered the identity/auth module and the full booking _schema_ (courts, reservations, including the Postgres exclusion constraint that makes double-booking structurally impossible). This phase builds the booking module's _business logic_ on top of that already-migrated schema, porting v7's design (reservation state machine, privacy rules, cancellation policy) into this project's established hexagonal conventions — mirroring the identity module's file organization, naming, and testing patterns exactly for consistency.

One new business rule not in v7 (locked in an earlier decision): a max of 2 concurrent active reservations per player.

## Approach

### Module structure (mirrors `modules/identity/` exactly)

```
apps/backend/src/modules/booking/
├── domain/
│   ├── entities/Reservation.js              # aggregate root, state machine
│   ├── errors/{DomainError,InvalidReservationState,HoldExpired,ReservationNotOwned,InvalidTimeSlot}.js
│   ├── policies/{bookingPolicy,cancellationPolicy,scheduleWindow}.js
│   └── services/reservationPrivacy.js        # "Regla 2" public/owner/staff projection
├── application/
│   ├── errors/{ReservationNotFound,CourtNotFound,SlotNotAvailable,MaxConcurrentReservationsExceeded}.js
│   ├── ports/{Clock,CourtRepository,ReservationRepository}.js
│   └── useCases/{listCourts,getSchedule,createHold,confirmReservation,cancelReservation}.js
└── infrastructure/
    ├── compositionRoot.js
    ├── jobs/expireHoldsJob.js
    ├── http/{bookingController,bookingRoutes,errorMapping}.js + validators/bookingValidators.js
    └── persistence/{prismaReservationRepository,prismaCourtRepository}.js
```

One new file inside **identity** (not a modification — booking imports it, matching how `packages/shared` is consumed): `modules/identity/infrastructure/http/middleware/optionalAuth.js`, since `GET /api/booking/schedule` must work for both anonymous and authenticated callers, and identity already owns JWT verification. `.dependency-cruiser.js`'s cross-module rule only fences `infrastructure/persistence/**`, so this HTTP-layer import is allowed and avoids duplicating token-parsing logic.

`packages/shared/src/validation/reservationSchemas.js` adds `holdSchema`, `confirmSchema`, `scheduleQuerySchema` (Zod), exported via the package's `index.js`.

### `Reservation` entity — state machine

Mirrors `User.js`'s shape (constructor destructuring, static factory, mutate-`this` methods, throw domain errors):

- `Reservation.createHold({...})` — status `HOLD`, type `PRIVATE`, `holdExpiresAt = now + 5min`.
- `confirm(paymentId, now)` — only from `HOLD`; throws `InvalidReservationState` if not HOLD, `HoldExpired` if past `holdExpiresAt` (defense-in-depth re-check; the scheduled job is the primary release mechanism). → `CONFIRMED`.
- `cancel(now, penaltyFreeWindowHours)` — from `HOLD` or `CONFIRMED` → `CANCELLED`; returns `{ withoutPenalty }` as a fact (booking computes no money — no billing module exists yet).
- `ensureOwnedBy(userId, isStaff)` — throws `ReservationNotOwned` unless caller is the holder or staff.
- `expire(now)` — idempotent no-op unless `HOLD` and past expiry → `EXPIRED`.
- `NO_SHOW`/`COMPLETED` transitions: not implemented — no use case or endpoint drives them this phase.

### `tstzrange` handling

`period` is `Unsupported("tstzrange")` in Prisma — excluded from the fluent client entirely. All reads (schedule, ownership checks, expiry job, concurrency count) use plain Prisma queries against the generated `periodStart`/`periodEnd` columns. Only creation needs raw SQL (`prisma.$queryRaw` with `tstzrange(...)`). The raw insert's catch block detects a Postgres exclusion violation (`err.meta?.code === '23P01'`) and translates it to `SlotNotAvailable` — optimistic-insert-and-catch, not check-then-insert. Confirm/cancel/expire use guarded `updateMany({ where: { id, status: { in: [...] } } })` so a 0-count result reveals the row changed underneath the call.

### Privacy projection ("Regla 2")

Pure function `domain/services/reservationPrivacy.js: projectForViewer(reservation, viewer)` — staff or the owner get full detail; CLASS/TOURNAMENT reservations show their real label to anyone; PRIVATE/MAINTENANCE/BLOCKED show only "Ocupada" to everyone else.

### Max-2-concurrent-reservations-per-player

Checked in `createHold` via `ReservationRepository.countOccupyingByHolder(userId)`. See `docs/adr/0006-max-concurrent-reservations-enforcement.md` for the race-condition analysis and why an application-level check (with an advisory-lock mitigation) was judged sufficient rather than a DB-level constraint.

### HOLD-expiry background job

`setInterval` (60s tick), guarded by the `shedlock` table via `INSERT ... ON CONFLICT DO UPDATE ... WHERE lock_until <= now()`, 50s lock TTL. Started from `server.js`, guarded by `config.isTest`.

### `DomainEventPublisher` — deferred

See `docs/adr/0007-defer-domain-event-publisher.md`.

### Endpoints

`GET /api/booking/courts` (public), `GET /api/booking/schedule?date=YYYY-MM-DD` (optional auth, privacy-projected), `POST /api/booking/hold` (auth), `POST /api/booking/confirm` (auth), `POST /api/booking/:id/cancel` (auth, owner-or-staff).

## Implementation order

1. Domain layer — pure unit tests (`Regla_*.test.js`), zero I/O.
2. Application layer against fakes.
3. Infrastructure: persistence (incl. the 7-case overlap-constraint suite through the repository).
4. Infrastructure: HTTP (`optionalAuth`, controller/routes/validators, `compositionRoot`, mount in `app.js`).
5. Background job.
6. Full verification pass.

## Verification

- Domain/application unit tests named in the `Regla_*` convention for traceability.
- The 7-case exclusion-constraint suite run through the actual repository, against real Postgres.
- `bookingHttp.test.js` proves the privacy rule and RBAC ownership end-to-end over real HTTP.
- `npx depcruise apps/backend/src --config .dependency-cruiser.js` clean.
- Manual curl smoke test of hold → double-booking rejection → confirm → schedule projection → cancel, against the live dev server.

## Explicitly out of scope this phase

NO_SHOW/COMPLETED transitions, any event-publishing mechanism, MAINTENANCE/BLOCKED reservation creation via player-facing endpoints, billing/payment validation, public website booking UI.

## Outcome

All 6 implementation steps completed. Final state: 50 new unit tests + 27 new integration tests (108 unit / 51 integration total across both modules), all passing against real Postgres/Mailhog. `dependency-cruiser` clean across 89 modules including the new cross-module `optionalAuth` import. ESLint clean repo-wide. Full curl smoke test passing against the live dev server (hold → double-booking 409 → confirm → schedule projection → cancel).

Two real bugs found and fixed during implementation, both documented in code comments at their fix sites:

- The fake `ReservationRepository`'s `findById()` returned a live object reference rather than a clone, causing an in-memory domain mutation (`reservation.confirm()`) to leak into what the fake considered "persisted" state before the atomic-transition guard checked it — defeating the guard's purpose. Fixed by cloning on every read, matching how a real ORM reconstructs a fresh object per query.
- The raw-SQL `createHold` insert omitted `updated_at`, which is `NOT NULL` with no DB-level default (only Prisma's client-side `@updatedAt`, which raw queries bypass) — every raw insert failed with a not-null violation until fixed.

One test-design lesson: the original "two concurrent `runOnce()` calls via `Promise.all`" test for the shedlock mutual-exclusion property was flaky (proved correct at the raw-Postgres level and in a minimal Prisma reproduction, but intermittently both-acquired inside the actual test suite) because JS-level `Promise.all` against a shared connection pool doesn't guarantee true simultaneity — the losing call can be queued behind the winner's entire acquire-work-release cycle rather than genuinely racing it, and the winner releases its lock immediately after finishing, closing the window before the loser even attempts. Rewritten as a deterministic test (manually seed a held lock row, assert a second instance is rejected, then lapse it and assert re-acquisition succeeds) — this proves the property that actually matters without depending on unreliable JS-level timing.
