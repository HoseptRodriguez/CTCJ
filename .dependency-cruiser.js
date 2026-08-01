/**
 * Mechanical enforcement of hexagonal layering, replacing the ArchUnit rules
 * from the ported v7 design. See docs/adr for rationale.
 */
module.exports = {
  forbidden: [
    {
      name: 'domain-no-framework-or-infra',
      comment:
        'Domain layers must be framework-agnostic: no infra, no application, no framework packages.',
      severity: 'error',
      from: { path: '^apps/backend/src/modules/[^/]+/domain' },
      to: {
        path: [
          '^apps/backend/src/modules/[^/]+/infrastructure',
          '^apps/backend/src/modules/[^/]+/application',
          '^apps/backend/src/shared',
        ],
      },
    },
    {
      name: 'domain-no-framework-packages',
      comment: 'Domain layers must not import framework/driver packages directly.',
      severity: 'error',
      from: { path: '^apps/backend/src/modules/[^/]+/domain' },
      to: {
        path: 'node_modules/(express|@prisma/client|argon2|jsonwebtoken|nodemailer|multer|cookie-parser)',
      },
    },
    {
      name: 'application-no-infra',
      comment: 'Use cases depend on ports, not concrete infrastructure adapters.',
      severity: 'error',
      from: { path: '^apps/backend/src/modules/[^/]+/application' },
      to: { path: '^apps/backend/src/modules/[^/]+/infrastructure' },
    },
    {
      name: 'no-cross-module-persistence',
      comment:
        "Modules may not reach into another module's persistence layer directly (own-module access, e.g. a composition root wiring its own adapters, is fine).",
      severity: 'error',
      from: { path: '^apps/backend/src/modules/([^/]+)/' },
      to: {
        path: '^apps/backend/src/modules/[^/]+/infrastructure/persistence',
        pathNot: '^apps/backend/src/modules/$1/infrastructure/persistence',
      },
    },
    {
      name: 'clinical-domain-isolated',
      comment: 'Placeholder: activate fully once modules/clinical exists (not Phase 1).',
      severity: 'error',
      from: { path: '^apps/backend/src/modules/(?!clinical)' },
      to: { path: '^apps/backend/src/modules/clinical/domain' },
    },
    {
      name: 'no-circular',
      severity: 'warn',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: false,
    exclude: '(^|/)(test|prisma/migrations|node_modules)($|/)',
  },
};
