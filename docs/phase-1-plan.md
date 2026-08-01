# CTCJ Platform — Phase 1: Foundation + Identity Module

_Approved plan, copied here from the planning session for durability. All items below are implemented — see the README for current status and `docs/adr/` for decisions made along the way._

## Context

This is a from-scratch build of the Club de Tenis Ciudad Jardín (CTCJ) management platform. Extensive discovery established that a prior, high-quality but abandoned build ("v7") already exists in Spring Boot/Java with hexagonal architecture, fully documented via ADRs, a Master Plan with a coded FR/NFR catalog, and verified business-rule tests. Per the user's explicit decision, we are **porting v7's design and business rules** — schema, RBAC model, state machines, validation logic — into the user's requested stack (Node.js/Express/Prisma/PostgreSQL backend, React/Vite/Tailwind frontend), not reusing Java code or rebuilding from zero.

Locked decisions from prior discussion govern this plan: single-club tenancy (with `club_id` on every root table for future SaaS optionality, per v7's ADR-0003), 9 Spanish-named roles with a two-layer RBAC barrier, Argon2id password hashing (confirmed over the originally-listed bcrypt, matching v7's tuned parameters), and a reservation policy (7-day advance window, 60-min slots, 12h cancellation cutoff, 5-min HOLD expiry, max 2 concurrent reservations/player — this last one is new, not in v7).

This phase covers **project foundation + the identity/auth module only**. Booking module business logic, the public website, and all other modules (billing, competition, coaching, clinical, notification) are explicitly out of scope and come in later phases — matching the user's "complete each feature before moving to the next" instruction. The booking _schema_ (courts, reservations) is included in this phase's migration because `reservations.holder_user_id`/`created_by` FK to `users`, giving a clean single migration baseline; booking _logic_ is Phase 2.

## Approach

### Monorepo structure

npm workspaces, single repo: `apps/backend`, `apps/frontend`, `packages/shared` (role constants + Zod validation schemas reused by both). Justification: lowest-ceremony option for current team size; revisit only if a second service is added.

### Database (Prisma + raw-SQL migration additions)

Full `schema.prisma` ports v7's V1–V3 Flyway tables: `Club`, `User`, `Role`, `Permission`, `RolePermission`, `UserRole`, `RefreshToken`, `EmailVerification`, `PasswordReset`, `SystemSetting`, `OutboxEvent`, `Court`, `Reservation`, `ShedLock`. Keep v7's VARCHAR+CHECK convention instead of native Postgres enums (ADR-0002 rationale: adding a status value should never require a type migration); status constants exported from `packages/shared` for DX, validated via Zod at the API boundary.

Prisma can't express several v7 DDL pieces natively, so after `prisma migrate dev --create-only`, hand-edit the generated `migration.sql` to add:

1. `CREATE EXTENSION pgcrypto/btree_gist/citext`
2. `citext` type for `users.email`, `clubs.contact_email`
3. Partial indexes on `users` (club_id+status WHERE not deleted, club_id+document_number)
4. `user_roles` unique partial index (active-role-only) + revocation-coherence CHECK
5. `refresh_tokens` expiry CHECK
6. `user_roles_view` (read-model of active roles) — raw SQL + `$queryRaw` access
7. `audit_logs` as a **hand-written** partitioned table (`PARTITION BY RANGE (occurred_at)`, composite PK `(id, occurred_at)`, monthly partitions + DEFAULT partition), replacing Prisma's generated version entirely
8. `reservations.period` as `TSTZRANGE` with generated `period_start`/`period_end` STORED columns, the `EXCLUDE USING gist (court_id WITH =, period WITH &&) WHERE status IN ('HOLD','CONFIRMED')` constraint (the mechanism that makes double-booking structurally impossible), and its supporting GIST/partial indexes
9. `outbox_events` partial index on unprocessed rows

Seed script (`prisma/seed.js`): 1 club, 9 roles with correct `self_assignable`/`requires_mfa` flags, baseline identity permissions, 3 courts (clay, courts 1–2 lit, court 3 unlit, price left null pending real Admin Settings input).

### Backend module structure (hexagonal, framework-agnostic domain)

```
apps/backend/src/
├── config/env.js                # Zod-validated env, sole process.env access point
├── modules/identity/
│   ├── domain/                  # plain JS, zero express/prisma/argon2/jsonwebtoken imports
│   │   ├── entities/{User,Role}.js
│   │   ├── errors/{SelfAssignmentForbidden,InvalidCredentials,AccountLockedError}.js
│   │   ├── policies/{passwordPolicy,lockoutPolicy}.js
│   │   └── services/grantRole.js        # domain-level RBAC barrier #2
│   ├── application/
│   │   ├── ports/{UserRepository,RoleRepository,RefreshTokenRepository,PasswordHasher,TokenService,EmailSender,Clock}.js
│   │   └── useCases/{registerUser,loginUser,refreshSession,verifyEmail,logoutUser,grantRoleToUser}.js
│   └── infrastructure/          # only layer allowed to import express/prisma/argon2/jsonwebtoken
│       ├── persistence/prisma*Repository.js
│       ├── security/{argon2PasswordHasher,jwtTokenService}.js
│       ├── email/nodemailerEmailSender.js
│       └── http/{authRoutes,adminRoutes,authController,middleware/{requireAuth,requireRole},validators/authValidators}.js
├── shared/{prismaClient,logger,errors/httpError}.js
├── app.js
└── server.js
```

Layering enforced mechanically (not just by convention) via `dependency-cruiser` (`.dependency-cruiser.js` at repo root), replicating v7's ArchUnit rules: domain can't import infrastructure/application/framework packages; application can't import infrastructure; modules can't cross-import each other's persistence layer; clinical domain isolation rule pre-written as a placeholder for when that module exists. Run in CI and as a Husky pre-commit hook.

### Ported business logic (exact v7 parameters/mechanics)

- **Argon2id**: iterations=3, memory=64MB, parallelism=1, hash length=32, via `argon2` npm package (PHC-format output, no custom string parsing needed).
- **JWT access tokens**: 15-min TTL, HMAC-signed, claims `{sub, roles, iat, exp}`, no PII.
- **Refresh tokens**: opaque 32-byte random value (not a JWT), SHA-256 hash stored (never plaintext), HttpOnly/Secure/SameSite=Strict cookie scoped to `/api/auth`, 30-day TTL, rotation via `family_id` + `replacedBy` chain, reuse detection revokes the whole family.
- **Account lockout**: locks after 5 failed attempts, duration = `1min * over²` (over = attempts-5+1) capped at 1 hour, resets on success. Login failure responses never distinguish wrong-password / no-such-account / locked-account (uniform generic 401 — prevents enumeration).
- **RBAC double barrier**: route middleware (`requireRole('ADMINISTRADOR')`) + independent domain check (`grantRole()` throws `SelfAssignmentForbidden` unless `role.selfAssignable || grantorIsAdmin`) — tested independently so the rule holds even if a future code path bypasses the route.

### Endpoints (Phase 1)

`POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `GET /api/auth/verify?token=`, `POST /api/auth/logout`, `POST /api/admin/roles/grant` (ADMINISTRADOR-only).

### Minimal frontend

Vite + React + Tailwind with placeholder brand tokens (explicit TODO comments — real logo/typography/colors are still unconfirmed per earlier brand-manual audit). Three screens only: Register, Login, VerifyEmail — enough to prove the API end-to-end. No public website content, no dashboards yet.

### Key packages

Backend: `express`, `@prisma/client`/`prisma`, `argon2`, `jsonwebtoken`, `zod`, `multer` (scaffolded, unused this phase), `nodemailer`, `dotenv`, `cookie-parser`, `helmet`, `cors`, `pino`, `vitest`+`supertest` (dev). Frontend: `react`, `vite`, `tailwindcss`, `react-router-dom`, `zod`; native `fetch` instead of axios (Phase 1's ~5 API calls don't need axios's interceptor machinery).

## Implementation order

1. Repo scaffolding (workspaces, lint/format/depcruise configs, docker-compose Postgres, `.env.example`)
2. Config module + `/health` endpoint
3. Prisma schema + migration (identity + booking tables) + seed — validate the EXCLUDE constraint standalone via psql before any app code depends on it
4. Domain layer (pure unit tests, no DB/HTTP)
5. Application layer against in-memory fakes (proves business logic before real infra exists)
6. Infrastructure adapters (real Postgres/argon2/JWT/email, adapter-level integration tests)
7. HTTP layer + wiring, end-to-end `supertest` integration tests
8. dependency-cruiser + CI wiring (Husky pre-commit, GitHub Actions)
9. Minimal frontend (3 screens, wired to live backend)
10. Full verification pass

## Verification

- **DB-constraint tests** replicating v7's 7-case overlap suite (identical/overlapping/adjacent periods, different statuses, different courts) asserting on Postgres exclusion-violation error code `23P01`.
- **Named business-rule tests** (mirroring v7's naming for traceability): password length boundaries, self-assignment forbidden at domain level, double-barrier role grant, lockout math at multiple attempt counts, uniform login-failure response, refresh-token rotation/reuse-detection, token expiry handling.
- **Architecture enforcement**: `npm run lint:arch` (dependency-cruiser) required in CI; demonstrated failing on a deliberately introduced cross-module persistence import, then reverted.
- **Manual smoke test** (curl script in README): register → verify → login → attempt admin action as non-admin (expect 403) → refresh → logout → confirm rotated-out cookie is rejected.
- **Frontend smoke**: real headless-browser walkthrough (Playwright) of Register → verify (via Mailhog) → Login → authenticated state renders, with screenshots at each step.

## Explicitly out of scope this phase

Booking module business logic (HOLD/CONFIRMED use cases, cancellation policy enforcement), public website, billing/competition/coaching/clinical/notification modules, real brand/design system (placeholder tokens only), Wompi integration, DIAN invoicing.

## Outcome

All 10 implementation steps completed. Final state: 58 unit tests + 28 integration tests passing (real Postgres, real argon2, real JWT, real Mailhog email delivery), `dependency-cruiser` clean across 56 modules with 0 layering violations, ESLint clean repo-wide, full curl smoke script passing against the live dev server, and a real-browser Playwright walkthrough confirming the register → verify → login flow renders correctly (a StrictMode double-invoke bug in `VerifyEmail.jsx`'s token-consumption effect was found and fixed during this pass — see the ref-guard comment in that file).
