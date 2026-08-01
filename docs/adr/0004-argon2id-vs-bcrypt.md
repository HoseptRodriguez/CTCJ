# ADR-0004: Argon2id instead of bcrypt for password hashing

## Context

The original tech-stack instructions named bcrypt for password hashing. The
prior Spring Boot prototype ("v7") — whose design this platform explicitly
ports — used Argon2id instead, with specific tuned parameters. This was
raised explicitly with the user rather than silently decided, since it's a
deviation from a named technology.

## Decision

Argon2id, via the `argon2` npm package, with parameters matching v7 exactly:
`timeCost: 3` (iterations), `memoryCost: 65536` (64 MB, KiB), `parallelism:
1`, `hashLength: 32`. See `apps/backend/src/modules/identity/infrastructure/
security/argon2PasswordHasher.js`.

## Why the user chose this over bcrypt

- Argon2id is OWASP's current recommendation for new applications: it's
  memory-hard, which resists GPU/ASIC cracking meaningfully better than
  bcrypt's fixed, low memory cost.
- v7's parameters were already tuned and documented; reusing them costs
  nothing and discards no established value.
- The `argon2` npm package wraps the reference Argon2 C implementation, is
  actively maintained, and produces self-describing PHC-format hashes
  (`$argon2id$v=19$m=65536,t=3,p=1$...`) — `argon2.verify()` parses these
  directly, so there's no custom hash-format parsing to write or maintain.

## Consequences

- Each hash operation uses ~64 MB of memory. At CTCJ's scale (hundreds of
  users, not thousands of concurrent logins) this is not a capacity concern;
  revisit only if hosting on a memory-constrained container under unusually
  high login concurrency.
- Verified in `test/integration/identity/argon2PasswordHasher.test.js`
  against the real `argon2` package (not a fake), including that two hashes
  of the same password differ (per-hash random salt).
