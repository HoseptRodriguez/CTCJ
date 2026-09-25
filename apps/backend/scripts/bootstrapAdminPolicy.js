/**
 * Pure (no DB, no process.exit) decision logic for scripts/bootstrapAdmin.js,
 * kept separate so every refusal path is unit-testable.
 */
import { timingSafeEqual } from 'node:crypto';

export const MIN_BOOTSTRAP_TOKEN_LENGTH = 24;

export const USAGE =
  'Usage: node scripts/bootstrapAdmin.js <email>\n' +
  '  production: NODE_ENV=production BOOTSTRAP_TOKEN=<secret> ' +
  'node scripts/bootstrapAdmin.js <email> --confirm --token <secret>';

/**
 * @param {string[]} argv process.argv.slice(2)
 * @returns {{ email: string|null, confirm: boolean, token: string|null }}
 */
export function parseBootstrapArgs(argv) {
  let email = null;
  let confirm = false;
  let token = null;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--confirm') {
      confirm = true;
    } else if (arg === '--token') {
      token = argv[i + 1] ?? null;
      i += 1;
    } else if (arg.startsWith('--token=')) {
      token = arg.slice('--token='.length);
    } else if (!arg.startsWith('--') && email === null) {
      email = arg.trim().toLowerCase();
    }
  }
  return { email, confirm, token };
}

function tokensMatch(expected, provided) {
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Development keeps the original behaviour (email only). Production needs
 * all three: --confirm, a configured BOOTSTRAP_TOKEN of a sane length, and
 * a --token that matches it -- so neither a stray invocation nor someone
 * with shell access but without the secret can mint an administrator.
 *
 * @param {{ isProduction: boolean, bootstrapToken: string, args: ReturnType<typeof parseBootstrapArgs> }} input
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function authorizeBootstrap({ isProduction, bootstrapToken, args }) {
  if (!args.email) {
    return { ok: false, reason: USAGE };
  }
  if (!isProduction) {
    return { ok: true };
  }
  if (!args.confirm) {
    return { ok: false, reason: `Refusing to run in production without --confirm.\n${USAGE}` };
  }
  if (!bootstrapToken || bootstrapToken.length < MIN_BOOTSTRAP_TOKEN_LENGTH) {
    return {
      ok: false,
      reason: `Refusing to run in production: BOOTSTRAP_TOKEN must be set to a secret of at least ${MIN_BOOTSTRAP_TOKEN_LENGTH} characters.`,
    };
  }
  if (!args.token || !tokensMatch(bootstrapToken, args.token)) {
    return {
      ok: false,
      reason: 'Refusing to run in production: --token does not match BOOTSTRAP_TOKEN.',
    };
  }
  return { ok: true };
}

/**
 * Only an existing, verified, active account can be promoted.
 * @param {{ status: string, emailVerifiedAt: Date|null } | null} user
 * @param {string} email
 * @returns {string|null} a refusal reason, or null when eligible
 */
export function checkBootstrapTarget(user, email) {
  if (!user) {
    return `No user found with email "${email}". Register through /register and verify the email first.`;
  }
  if (!user.emailVerifiedAt) {
    return `"${email}" has not verified their email yet. Open the verification link first, then re-run.`;
  }
  if (user.status !== 'ACTIVE') {
    return `"${email}" is ${user.status}, not ACTIVE -- refusing to grant ADMINISTRADOR.`;
  }
  return null;
}
