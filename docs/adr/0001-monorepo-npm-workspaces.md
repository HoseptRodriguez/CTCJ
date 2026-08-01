# ADR-0001: Monorepo via npm workspaces

## Context

The platform has a backend (Express/Prisma), a frontend (React/Vite), and a
small package of code shared between them (role/reservation constants, Zod
validation schemas). These need to evolve together, especially early on
while the API contract is still moving.

## Decision

Single git repository, npm workspaces (`apps/backend`, `apps/frontend`,
`packages/shared`), root-level shared tooling (ESLint, Prettier,
dependency-cruiser, Husky).

## Alternatives considered

- **Separate repositories** for frontend/backend: rejected — adds
  coordination overhead (versioning, cross-repo PRs) with no benefit at this
  team size, and makes keeping `packages/shared`'s validation schemas in
  sync harder, not easier.
- **Turborepo / Nx**: rejected for Phase 1 — real value (remote caching,
  affected-graph builds) only shows up with more packages/apps and CI
  minutes than this project has yet. Revisit if a second backend service or
  a mobile app is added.

## Consequences

- `npm install` at the repo root installs everything; workspace packages
  (`@ctcj/shared`) resolve via symlinks in `node_modules`.
- Root `package.json` scripts (`lint`, `lint:arch`) operate repo-wide;
  per-workspace scripts (`dev`, `test`) run via `npm run <script> -w <app>`.
