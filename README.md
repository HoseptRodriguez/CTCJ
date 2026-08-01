# Club de Tenis Ciudad Jardin (CTCJ) — Platform

Management platform for Club de Tenis Ciudad Jardin: public site, court
reservations, memberships/billing, competitions/rankings, coaching, and
clinical (psychology/physiotherapy) modules.

**Status: Phase 1 (Foundation + Identity) and Phase 2 (Booking) complete.**
Auth (register/login/refresh/verify/logout), RBAC (role grants), and court
reservations (hold/confirm/cancel, structurally double-booking-proof,
privacy-projected schedule, automatic HOLD expiry) are fully implemented,
tested, and wired end-to-end. Billing, competition, coaching, and clinical
modules are designed (see `docs/`) but not yet built.

This is a from-scratch Node.js/Express/Prisma/PostgreSQL + React/Vite/Tailwind
build that ports the design and verified business rules of a prior Spring
Boot/Java prototype ("v7") — not its code. See the Phase 1 plan and ADRs for
the reasoning behind key decisions (schema, RBAC, security).

## Prerequisites

- Node.js 20.x (see `.nvmrc`)
- Docker Desktop (for Postgres 16 + Mailhog in local dev)

## Setup

```bash
npm install
docker compose up -d          # Postgres on :5432, Mailhog on :1025/:8025
cp .env.example apps/backend/.env   # then fill in a real JWT_ACCESS_SECRET
npm run prisma:migrate        # apps/backend: applies prisma/migrations
npm run prisma:seed           # apps/backend: club, 9 roles, permissions, 3 courts
```

`apps/backend/.env.test` is committed (test-only, non-secret values) and
points at a separate `ctcj_test` database so integration tests never touch
your dev data. Create and migrate it once:

```bash
docker exec ctcj-postgres psql -U ctcj -d postgres -c "CREATE DATABASE ctcj_test;"
cd apps/backend
DATABASE_URL="postgresql://ctcj:ctcj_dev_password@localhost:5432/ctcj_test?schema=public" npx prisma migrate deploy
DATABASE_URL="postgresql://ctcj:ctcj_dev_password@localhost:5432/ctcj_test?schema=public" node prisma/seed.js
```

## Run

```bash
npm run dev:backend    # http://localhost:3000
npm run dev:frontend   # http://localhost:5173 (Vite dev server, proxies /api to :3000)
```

Verification emails land in Mailhog's web UI at http://localhost:8025 (dev
SMTP catcher — nothing is sent to a real inbox).

## Test

```bash
npm test                                  # backend unit tests (Vitest)
npm run -w apps/backend test:integration  # backend integration tests (real Postgres/Mailhog)
npm run lint                              # ESLint, whole repo
npm run lint:arch                         # dependency-cruiser hexagonal-layering rules
```

CI (`.github/workflows/ci.yml`) runs all of the above on every push/PR
against fresh Postgres + Mailhog service containers.

## Manual smoke test

With both dev servers and Docker running:

```bash
# 1. Register
curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"jugador1@example.com","password":"ClaveSegura123","firstName":"Ana","lastName":"Gomez"}'

# 2. Find the verification link in Mailhog (http://localhost:8025), then:
curl -s "http://localhost:3000/api/auth/verify?token=<TOKEN_FROM_EMAIL>"

# 3. Login — capture the access token (JSON body) + refresh token (Set-Cookie, HttpOnly)
curl -s -i -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jugador1@example.com","password":"ClaveSegura123"}' \
  -c cookies.txt

# 4. Confirm RBAC: a plain USUARIO cannot grant roles (expect 403)
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/admin/roles/grant \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"userId":"<some-uuid>","roleCode":"ENTRENADOR"}'

# 5. Refresh (rotates the cookie; the old cookie is rejected afterwards)
curl -s -X POST http://localhost:3000/api/auth/refresh -b cookies.txt -c cookies.txt

# 6. Logout
curl -s -X POST http://localhost:3000/api/auth/logout -b cookies.txt

# 7. List courts (public)
curl -s http://localhost:3000/api/booking/courts

# 8. Hold a slot (needs a fresh <ACCESS_TOKEN>; start/end must be ISO-8601
#    with offset, exactly 60 minutes apart, 30min-7days from now)
curl -s -X POST http://localhost:3000/api/booking/hold \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"courtId":"<COURT_ID>","start":"<ISO_START>","end":"<ISO_END>"}'

# 9. Confirm (paymentId is currently an opaque placeholder UUID -- no billing module yet)
curl -s -X POST http://localhost:3000/api/booking/confirm \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"reservationId":"<RESERVATION_ID>","paymentId":"<ANY_UUID>"}'

# 10. Schedule for that day -- anonymous callers see "Ocupada" only, never who reserved
curl -s "http://localhost:3000/api/booking/schedule?date=YYYY-MM-DD"

# 11. Cancel (owner or staff only; >=12h before start is penalty-free)
curl -s -X POST http://localhost:3000/api/booking/<RESERVATION_ID>/cancel \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

Or drive the actual browser UI at http://localhost:5173/register — the
Register → verify-email link (from Mailhog) → Login flow renders an
authenticated "Bienvenido... Roles: USUARIO" state on success. (The frontend
doesn't have a booking UI yet -- Phase 2 was API-only, see "What's next".)

## Project structure

```
apps/
  backend/    Express + Prisma API. Hexagonal per module: domain/ (framework-
              agnostic) -> application/ (use cases + ports) -> infrastructure/
              (Prisma, Express routes, argon2, JWT, nodemailer). Modules:
              identity/ (auth, RBAC) and booking/ (courts, reservations,
              HOLD-expiry job).
  frontend/   React + Vite + Tailwind. Phase 1: Register/Login/VerifyEmail
              only, placeholder brand tokens (see tailwind.config.js TODOs).
              No booking UI yet (Phase 2 was API-only).
packages/
  shared/     Role/reservation constants + Zod validation schemas, reused by
              both frontend and backend.
docs/adr/     Architecture decision records.
```

Layering is enforced mechanically, not just by convention: `npm run lint:arch`
(dependency-cruiser, `.dependency-cruiser.js`) fails the build if domain code
imports Express/Prisma/infrastructure, if application code imports
infrastructure, or if one module reaches into another module's persistence
layer directly. This runs in CI and as a Husky pre-commit hook.

## Key architectural decisions

- **Double-booking is structurally impossible at the database level** — a
  Postgres `EXCLUDE USING gist` constraint on the `reservations` table (not
  application code) rejects any overlapping HOLD/CONFIRMED reservation for
  the same court. Verified against 7 real-Postgres test cases, twice: once
  directly against the constraint (Phase 1), once through the repository
  layer's `createHold()` (Phase 2).
- **RBAC has two independent barriers**: an Express route guard
  (`requireRole`) and a domain-level check (`User.grantRole` throws
  `SelfAssignmentForbidden`) — the domain rule holds even if a future code
  path bypasses the route.
- **Argon2id** (not bcrypt) for password hashing, matching the ported v7
  design — see `docs/adr/0004-argon2id-vs-bcrypt.md`.
- **Every root table carries a `club_id`** from day one so a future
  multi-club pivot is a config change, not a schema migration.
- Status/type columns are `VARCHAR + CHECK`, not native Postgres `ENUM`, so
  adding a new value never requires a type migration.
- **Court reservation privacy** ("Regla 2"): only the reservation's holder
  and staff (Reception/Administrator) ever see who booked a court. Everyone
  else sees "Ocupada" -- except CLASS/TOURNAMENT reservations, which show
  their real label since that's institutional, not personal, information.
  Enforced by one pure, exhaustively-tested function
  (`domain/services/reservationPrivacy.js`), not a DB-level filter.
- **The HOLD-expiry sweep is lock-guarded, not per-instance**: a `setInterval`
  job claims the existing `shedlock` table before sweeping expired holds, so
  running multiple backend instances later never double-processes -- see
  `docs/adr` and `infrastructure/jobs/expireHoldsJob.js`.
- **Max-2-concurrent-reservations-per-player** is an application-level check
  (not a DB constraint) with a documented, accepted race window and a cheap
  advisory-lock mitigation -- see `docs/adr/0006-max-concurrent-reservations-enforcement.md`.

## Known local-dev gotcha

Docker Desktop on Windows can go idle and drop its containers between work
sessions even though `docker ps` last showed them healthy. If you see
`Can't reach database server at localhost:5432`, run `docker compose up -d`
again (or launch Docker Desktop) before re-testing.

## What's next (Phase 3+)

Public website (incl. a real booking UI -- Phase 2 was API-only), billing
(Wompi + DIAN e-invoicing), competition (tournaments/rankings), coaching, and
clinical modules. See `docs/phase-1-plan.md` and `docs/phase-2-plan.md` for
the approved plans and scope boundaries of what's already built, and
`docs/adr/` for the reasoning behind specific technical decisions.
