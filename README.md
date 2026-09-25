# Club de Tenis Ciudad Jardin (CTCJ) — Platform

Management platform for Club de Tenis Ciudad Jardin (Fusagasugá): public
site, court reservations, memberships/billing, competition and tournaments,
coaching, clinical care (psychology/physiotherapy), player goals, challenges,
notifications and a player community.

This is a from-scratch Node.js/Express/Prisma/PostgreSQL + React/Vite/Tailwind
build that ports the design and verified business rules of a prior Spring
Boot/Java prototype ("v7") — not its code. See `docs/` for the original phase
plans and ADRs.

## Status

All 11 backend modules are implemented, mounted in `apps/backend/src/app.js`,
covered by unit + integration tests, and have a frontend UI (player area at
`/mi-ctcj`, staff area at `/staff`).

| Module            | What it does                                                                                                                                                                                                 | API mount(s)                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| **identity**      | Register/login/refresh/logout, email verification, password reset, RBAC role grants, profile + avatar, achievements, membership status, affiliation (player) requests, guardianships (minors), player search | `/api/auth`, `/api/identity/me`, `/api/players`, `/api/admin/{roles,users,affiliation-requests,guardianships}` |
| **booking**       | Courts, prices, privacy-projected schedule, HOLD → CONFIRMED reservations, cancellation, front-desk payments, overdue-membership policy, HOLD-expiry job                                                     | `/api/booking`                                                                                                 |
| **billing**       | Membership plans + price history, player memberships, adjustments, invoices, invoice payments, monthly revenue                                                                                               | `/api/admin/billing`, `/api/billing/me`                                                                        |
| **coaching**      | Coach notes and performance ratings per player, recent activity                                                                                                                                              | `/api/admin/coaching`, `/api/coaching/me`                                                                      |
| **clinical**      | Psychology/neuropsychology/physiotherapy appointments, clinical notes, recovery plans, medical history                                                                                                       | `/api/admin/clinical`, `/api/clinical/me`                                                                      |
| **competition**   | Seasons, recorded matches, standings (ranking), player summary                                                                                                                                               | `/api/competition`                                                                                             |
| **tournament**    | Tournaments, participants, seeded draw generation (from competition standings), results                                                                                                                      | `/api/tournaments`                                                                                             |
| **goals**         | Player-owned goals; progress computed on read from booking/coaching/competition                                                                                                                              | `/api/goals/me`                                                                                                |
| **challenges**    | Player-to-player challenges; a confirmed score is recorded as a competition match                                                                                                                            | `/api/challenges/me`                                                                                           |
| **notifications** | In-app notifications (challenges, community)                                                                                                                                                                 | `/api/notifications/me`                                                                                        |
| **community**     | Posts, comments, likes, reports, staff moderation                                                                                                                                                            | `/api/community`, `/api/admin/community`                                                                       |

**Not built yet:** online payments (Wompi) and DIAN e-invoicing — payments
are recorded by staff at the front desk; permission-level RBAC (the
`permissions` tables are seeded but authorization is role-based via
`requireRole`); writes to `audit_logs`/`outbox_events` (see ADR-0007).

`AUDITORIA.md` has the full audit: every frontend route and the endpoints
it calls, every Prisma model and migration, and deploy blockers.

## Prerequisites

- Node.js 20.x (see `.nvmrc`)
- Docker Desktop (Postgres 16 + Mailhog for local dev)

## Setup

```bash
npm install
docker compose up -d                  # Postgres on :5432, Mailhog on :1025/:8025
cp .env.example apps/backend/.env     # then set a real JWT_ACCESS_SECRET
npm run prisma:migrate                # apps/backend: applies prisma/migrations
npm run prisma:seed                   # apps/backend: club, 9 roles, permissions, 3 courts
```

### First administrator

Granting roles requires an existing ADMINISTRADOR, so the first one is
created with a script. The account must already be registered **and have
verified its email**.

```bash
# development
npm run -w apps/backend bootstrap:admin -- you@example.com

# production (e.g. from the Render shell): needs --confirm and a --token equal
# to the BOOTSTRAP_TOKEN env var (>= 24 chars). Remove BOOTSTRAP_TOKEN afterwards.
node apps/backend/scripts/bootstrapAdmin.js you@example.com --confirm --token "$BOOTSTRAP_TOKEN"
```

## Run

```bash
npm run dev:backend    # http://localhost:3000
npm run dev:frontend   # http://localhost:5173 (Vite; proxies /api and /uploads to :3000)
```

Verification and password-reset emails land in Mailhog's web UI at
http://localhost:8025 — nothing is sent to a real inbox in development.

## Test

```bash
npm test                                  # backend unit + frontend tests (Vitest, no DB)
npm run -w apps/backend test:integration  # backend integration tests (real Postgres + Mailhog)
npm run lint                              # ESLint, whole repo
npm run lint:arch                         # dependency-cruiser hexagonal-layering rules
```

### Separate test database (required for integration tests)

Integration tests delete rows from real tables, so they run against their
own `ctcj_test` database, never `ctcj_dev`. `test/integration/setupEnv.js`
**aborts** if `DATABASE_URL` doesn't contain `_test`. One-time setup:

```bash
# 1. Create the database inside the docker-compose Postgres container
docker exec ctcj-postgres psql -U ctcj -d postgres -c "CREATE DATABASE ctcj_test;"

# 2. Create the (gitignored) test env file from the template
cp apps/backend/.env.test.example apps/backend/.env.test

# 3. Migrate and seed it
cd apps/backend
DATABASE_URL="postgresql://ctcj:ctcj_dev_password@localhost:5432/ctcj_test?schema=public" npx prisma migrate deploy
DATABASE_URL="postgresql://ctcj:ctcj_dev_password@localhost:5432/ctcj_test?schema=public" node prisma/seed.js
```

Re-run step 3 whenever new migrations are added.

CI (`.github/workflows/ci.yml`) runs lint, architecture rules, unit and
integration tests on every push/PR against fresh Postgres + Mailhog service
containers.

## Production configuration

`apps/backend/src/config/env.js` validates the environment at boot. With
`NODE_ENV=production` the server **refuses to start** unless these are set:

| Variable                      | Purpose                                                                                              |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| `RESEND_API_KEY`, `MAIL_FROM` | Transactional email through [Resend](https://resend.com) (development uses SMTP → Mailhog)           |
| `BLOB_READ_WRITE_TOKEN`       | Avatar storage in Vercel Blob (development without a token writes to `apps/backend/uploads/avatars`) |

Also set `DATABASE_URL`, `JWT_ACCESS_SECRET`, `APP_PUBLIC_URL` (used in email
links) and `CORS_ORIGIN`. `BOOTSTRAP_TOKEN` is only needed once, for the
first administrator (see above).

### Deploy (Render)

`render.yaml` is a Render blueprint: one Node web service plus a Postgres
database. `npm run build` builds the frontend and generates the Prisma
client; `npm run start` applies migrations, seeds reference data
(idempotent), and starts the API, which also serves `apps/frontend/dist`
from the same origin. Serving both from one origin avoids CORS and keeps the
`SameSite=Strict` refresh cookie working. Deploying to a serverless host
such as Vercel needs more work — see §4 of `AUDITORIA.md`.

## Project structure

```
apps/
  backend/    Express + Prisma API. One hexagonal module per bounded context
              under src/modules/<module>/: domain/ (framework-agnostic, where
              the module has real rules) -> application/ (use cases + ports)
              -> infrastructure/ (Prisma, Express routes, adapters). Modules:
              identity, booking, billing, coaching, clinical, competition,
              tournament, goals, challenges, notifications, community.
              Cross-module wiring happens only in src/app.js, via each
              consumer's own ports + adapters.
  frontend/   React 18 + Vite + Tailwind + framer-motion + react-router.
              Public site, player area (/mi-ctcj) and role-gated staff
              area (/staff/*). One API client per backend module in src/api/.
packages/
  shared/     Role/status constants + Zod validation schemas, reused by both
              frontend and backend.
docs/         Phase plans and architecture decision records (docs/adr/).
```

Layering is enforced mechanically, not just by convention: `npm run lint:arch`
(dependency-cruiser, `.dependency-cruiser.js`) fails the build if domain code
imports Express/Prisma/infrastructure, if application code imports
infrastructure, or if one module reaches into another module's persistence
layer directly. This runs in CI and as a Husky pre-commit hook.

## Key architectural decisions

- **Double-booking is structurally impossible at the database level** — a
  Postgres `EXCLUDE USING gist` constraint on `reservations` (and another on
  clinical appointments) rejects overlapping bookings, not application code.
- **RBAC has two independent barriers**: an Express route guard
  (`requireRole`) and a domain-level check (`User.grantRole` throws
  `SelfAssignmentForbidden`).
- **Argon2id** (not bcrypt) for password hashing — see `docs/adr/0004-argon2id-vs-bcrypt.md`.
- **Every root table carries a `club_id`** so a future multi-club pivot is a
  config change, not a schema migration.
- Status/type columns are `VARCHAR + CHECK`, not native Postgres `ENUM`, so
  adding a value never requires a type migration.
- **Court reservation privacy** ("Regla 2"): only the holder and staff
  (Reception/Administrator) see who booked a court; everyone else sees
  "Ocupada" (CLASS/TOURNAMENT reservations show their institutional label).
  Enforced by one pure function, `booking/domain/services/reservationPrivacy.js`.
- **The HOLD-expiry sweep is lock-guarded**: a `setInterval` job claims the
  `shedlock` table before sweeping, so multiple backend instances never
  double-process.
- **Max-2-concurrent-reservations-per-player** is an application-level check
  with a documented race window — see `docs/adr/0006-max-concurrent-reservations-enforcement.md`.
- **Registration is retry-safe**: registering again with an email whose
  account was never verified resends the verification link (keeping the
  original password) instead of failing with "email already registered".
- **Auth endpoints are rate-limited** (login, register, password reset) with
  `express-rate-limit`.

## Known local-dev gotcha

Docker Desktop on Windows can go idle and drop its containers between work
sessions. If you see `Can't reach database server at localhost:5432`, run
`docker compose up -d` again (or launch Docker Desktop).
