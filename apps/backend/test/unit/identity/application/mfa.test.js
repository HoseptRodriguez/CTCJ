import { describe, expect, it } from 'vitest';

import { User } from '../../../../src/modules/identity/domain/entities/User.js';
import { stepAt, totpForStep } from '../../../../src/modules/identity/domain/services/totp.js';
import { createMfaUseCases } from '../../../../src/modules/identity/application/useCases/mfa.js';
import { createMfaLoginUseCases } from '../../../../src/modules/identity/application/useCases/mfaLogin.js';
import { createLoginUser } from '../../../../src/modules/identity/application/useCases/loginUser.js';
import { createAesMfaCrypto } from '../../../../src/modules/identity/infrastructure/security/aesMfaCrypto.js';
import { createJwtTokenService } from '../../../../src/modules/identity/infrastructure/security/jwtTokenService.js';
import { CannotChangeOwnAccount } from '../../../../src/modules/identity/application/errors/CannotChangeOwnAccount.js';
import { InvalidMfaToken } from '../../../../src/modules/identity/application/errors/InvalidMfaToken.js';
import { MfaCodeInvalid } from '../../../../src/modules/identity/application/errors/MfaCodeInvalid.js';
import { MfaLocked } from '../../../../src/modules/identity/application/errors/MfaLocked.js';
import { MfaRequiredForRole } from '../../../../src/modules/identity/application/errors/MfaRequiredForRole.js';

function createFakeMfaRepository() {
  const states = new Map();
  const codes = new Map();
  const get = (id) =>
    states.get(id) ?? {
      enabled: false,
      secret: null,
      enabledAt: null,
      failedCount: 0,
      lockedUntil: null,
      lastStep: null,
    };
  const set = (id, patch) => states.set(id, { ...get(id), ...patch });
  return {
    states,
    codes,
    async getState(id) {
      return {
        ...get(id),
        recoveryCodesLeft: (codes.get(id) ?? []).filter((c) => !c.usedAt).length,
      };
    },
    async savePendingSecret(id, secret) {
      set(id, { enabled: false, secret, failedCount: 0, lockedUntil: null, lastStep: null });
    },
    async enable(id, { now, lastStep, recoveryCodeHashes }) {
      set(id, { enabled: true, enabledAt: now, failedCount: 0, lockedUntil: null, lastStep });
      codes.set(
        id,
        recoveryCodeHashes.map((hash) => ({ hash, usedAt: null })),
      );
    },
    async disable(id) {
      states.delete(id);
      codes.delete(id);
    },
    async recordFailure(id, { failedCount, lockedUntil }) {
      set(id, { failedCount, lockedUntil });
    },
    async recordSuccess(id, { lastStep }) {
      set(id, { failedCount: 0, lockedUntil: null, ...(lastStep == null ? {} : { lastStep }) });
    },
    async replaceRecoveryCodes(id, hashes) {
      codes.set(
        id,
        hashes.map((hash) => ({ hash, usedAt: null })),
      );
    },
    async useRecoveryCode(id, hash, now) {
      const c = (codes.get(id) ?? []).find((x) => x.hash === hash && !x.usedAt);
      if (!c) return false;
      c.usedAt = now;
      return true;
    },
  };
}

const person = (id, roles) =>
  new User({
    id,
    clubId: 'c',
    email: `${id}@example.com`,
    passwordHash: 'hash',
    firstName: id,
    lastName: 'X',
    status: 'ACTIVE',
    roleCodes: ['USUARIO', ...roles],
    emailVerifiedAt: new Date('2026-01-01'),
  });

function setup() {
  let now = new Date('2026-09-29T12:00:00Z');
  const clock = { now: () => now, advance: (ms) => (now = new Date(now.getTime() + ms)) };
  const users = new Map(
    [
      person('admin', ['ADMINISTRADOR']),
      person('ana', ['JUGADOR']),
      person('fisio', ['FISIOTERAPEUTA']),
    ].map((u) => [u.id, u]),
  );
  const userRepository = {
    findById: async (id) => users.get(id) ?? null,
    findByEmail: async (_c, email) => [...users.values()].find((u) => u.email === email) ?? null,
    update: async (u) => u,
  };
  const mfaRepository = createFakeMfaRepository();
  const mfaCrypto = createAesMfaCrypto({ key: Buffer.alloc(32, 3) });
  const log = [];
  const revoked = [];
  const refreshTokenRepository = {
    revokeAllForUser: async (id) => revoked.push(id),
    create: async () => {},
  };
  const mfa = createMfaUseCases({
    userRepository,
    mfaRepository,
    mfaCrypto,
    qrRenderer: { toSvg: async (text) => `<svg data-uri="${text}"></svg>` },
    refreshTokenRepository,
    auditLog: { record: async (e) => log.push(e) },
    clock,
  });
  const tokenService = createJwtTokenService({
    accessSecret: 'x'.repeat(32),
    accessTtlSeconds: 900,
  });
  const session = { tokenService, refreshTokenRepository, clock, refreshTokenTtlMs: 86_400_000 };
  const mfaLogin = createMfaLoginUseCases({ userRepository, mfa, ...session });
  const login = (enforced) =>
    createLoginUser({
      userRepository,
      passwordHasher: { verify: async () => true },
      clubId: 'c',
      mfaRepository,
      mfaEnforced: enforced,
      ...session,
    });
  const codeNow = (secret, offsetSteps = 0) =>
    totpForStep(secret, stepAt(clock.now()) + offsetSteps);
  const secretOf = (id) => mfaCrypto.decryptSecret(mfaRepository.states.get(id).secret);

  async function enroll(id) {
    await mfa.startMfaSetup({ userId: id });
    const secret = secretOf(id);
    const { recoveryCodes } = await mfa.confirmMfaSetup({ userId: id, code: codeNow(secret) });
    clock.advance(30_000); // next step, so the next code isn't a replay
    return { secret, recoveryCodes };
  }

  return {
    mfa,
    mfaLogin,
    login,
    mfaRepository,
    log,
    revoked,
    clock,
    codeNow,
    secretOf,
    enroll,
    tokenService,
  };
}

describe('two-step verification (TOTP)', () => {
  it('turning it on: QR, a first code, 10 recovery codes shown once; the secret is stored encrypted', async () => {
    const t = setup();
    const start = await t.mfa.startMfaSetup({ userId: 'ana' });
    expect(start.qrSvg).toContain('otpauth://totp/');
    expect(start.manualKey).toMatch(/^[A-Z2-7]{4}( [A-Z2-7]{1,4})+$/);
    const stored = t.mfaRepository.states.get('ana').secret;
    expect(stored).toMatch(/^v1\./);
    expect(stored).not.toContain(start.manualKey.replace(/ /g, ''));

    await expect(t.mfa.confirmMfaSetup({ userId: 'ana', code: '000000' })).rejects.toBeInstanceOf(
      MfaCodeInvalid,
    );
    const { recoveryCodes } = await t.mfa.confirmMfaSetup({
      userId: 'ana',
      code: t.codeNow(t.secretOf('ana')),
    });
    expect(recoveryCodes).toHaveLength(10);
    // Only hashes are kept.
    const hashes = t.mfaRepository.codes.get('ana').map((c) => c.hash);
    expect(hashes.some((h) => recoveryCodes.includes(h))).toBe(false);
    expect(await t.mfa.getMfaStatus({ userId: 'ana' })).toMatchObject({
      enabled: true,
      required: false,
      recoveryCodesLeft: 10,
    });
    expect(t.log.map((e) => e.action)).toEqual(['mfa.enable']);
  });

  it('a code works once (no replay); a recovery code works once and is audited', async () => {
    const t = setup();
    const { secret, recoveryCodes } = await t.enroll('ana');
    const code = t.codeNow(secret);
    await t.mfa.verifyMfaCode({ userId: 'ana', code });
    await expect(t.mfa.verifyMfaCode({ userId: 'ana', code })).rejects.toBeInstanceOf(
      MfaCodeInvalid,
    );

    const r = await t.mfa.verifyMfaCode({
      userId: 'ana',
      recoveryCode: recoveryCodes[0].toLowerCase(),
    });
    expect(r).toEqual({ usedRecoveryCode: true, recoveryCodesLeft: 9 });
    await expect(
      t.mfa.verifyMfaCode({ userId: 'ana', recoveryCode: recoveryCodes[0] }),
    ).rejects.toBeInstanceOf(MfaCodeInvalid);
    expect(t.log.at(-1)).toMatchObject({
      action: 'mfa.recovery_code.use',
      after: { recoveryCodesLeft: 9 },
    });
  });

  it('5 wrong codes lock it for 15 minutes, even for the right code; then it works again', async () => {
    const t = setup();
    const { secret } = await t.enroll('ana');
    for (let i = 0; i < 4; i += 1) {
      await expect(t.mfa.verifyMfaCode({ userId: 'ana', code: '000000' })).rejects.toBeInstanceOf(
        MfaCodeInvalid,
      );
    }
    await expect(t.mfa.verifyMfaCode({ userId: 'ana', code: '000000' })).rejects.toBeInstanceOf(
      MfaLocked,
    );
    expect(t.log.at(-1).action).toBe('mfa.lockout');
    await expect(
      t.mfa.verifyMfaCode({ userId: 'ana', code: t.codeNow(secret) }),
    ).rejects.toBeInstanceOf(MfaLocked);
    t.clock.advance(15 * 60_000 + 1000);
    await expect(
      t.mfa.verifyMfaCode({ userId: 'ana', code: t.codeNow(secret) }),
    ).resolves.toMatchObject({
      usedRecoveryCode: false,
    });
  });

  it('mandatory roles cannot turn it off; optional ones can, with a code', async () => {
    const t = setup();
    const fisio = await t.enroll('fisio');
    await expect(
      t.mfa.disableMfa({ userId: 'fisio', code: t.codeNow(fisio.secret) }),
    ).rejects.toBeInstanceOf(MfaRequiredForRole);
    const ana = await t.enroll('ana');
    await t.mfa.disableMfa({ userId: 'ana', code: t.codeNow(ana.secret) });
    expect((await t.mfa.getMfaStatus({ userId: 'ana' })).enabled).toBe(false);
    expect(t.log.at(-1).action).toBe('mfa.disable');
  });

  it('Administración resets someone else (sessions closed, audited), never themselves', async () => {
    const t = setup();
    await t.enroll('fisio');
    const admin = { userId: 'admin', roles: ['USUARIO', 'ADMINISTRADOR'] };
    await expect(t.mfa.resetMfa({ actor: admin, userId: 'admin' })).rejects.toBeInstanceOf(
      CannotChangeOwnAccount,
    );
    await t.mfa.resetMfa({ actor: admin, userId: 'fisio' });
    expect((await t.mfa.getMfaStatus({ userId: 'fisio' })).enabled).toBe(false);
    expect(t.revoked).toEqual(['fisio']);
    expect(t.log.at(-1)).toMatchObject({
      action: 'mfa.reset',
      actorUserId: 'admin',
      entityId: 'fisio',
    });
  });

  it('sign-in: the password alone opens no session when MFA is on; the step token then does', async () => {
    const t = setup();
    const { secret } = await t.enroll('ana');
    const first = await t.login(true)({ email: 'ana@example.com', password: 'x' });
    expect(first).toEqual({ mfaRequired: true, mfaToken: expect.any(String) });
    expect(first).not.toHaveProperty('accessToken');

    await expect(
      t.mfaLogin.completeMfaLogin({ mfaToken: 'basura', code: t.codeNow(secret) }),
    ).rejects.toBeInstanceOf(InvalidMfaToken);
    const session = await t.mfaLogin.completeMfaLogin({
      mfaToken: first.mfaToken,
      code: t.codeNow(secret),
    });
    expect(session).toMatchObject({ accessToken: expect.any(String), usedRecoveryCode: false });
  });

  it('a mandatory role without MFA must turn it on before getting a session', async () => {
    const t = setup();
    const first = await t.login(true)({ email: 'admin@example.com', password: 'x' });
    expect(first).toEqual({ mfaSetupRequired: true, mfaToken: expect.any(String) });
    // The setup token isn't a login token.
    await expect(
      t.mfaLogin.completeMfaLogin({ mfaToken: first.mfaToken, code: '123456' }),
    ).rejects.toBeInstanceOf(InvalidMfaToken);
    await t.mfaLogin.startMfaSetupFromLogin({ mfaToken: first.mfaToken });
    const result = await t.mfaLogin.confirmMfaSetupFromLogin({
      mfaToken: first.mfaToken,
      code: t.codeNow(t.secretOf('admin')),
    });
    expect(result.recoveryCodes).toHaveLength(10);
    expect(result.accessToken).toEqual(expect.any(String));

    // Without enforcement (tests) or for optional roles: a session right away.
    expect(await t.login(false)({ email: 'fisio@example.com', password: 'x' })).toHaveProperty(
      'accessToken',
    );
    expect(await t.login(true)({ email: 'ana@example.com', password: 'x' })).toHaveProperty(
      'accessToken',
    );
  });

  it('the step token is never accepted as an access token', () => {
    const t = setup();
    const token = t.tokenService.issueMfaToken('ana', 'login');
    expect(t.tokenService.verifyMfaToken(token, 'login')).toBe('ana');
    expect(t.tokenService.verifyMfaToken(token, 'setup')).toBeNull();
    const access = t.tokenService.issueAccessToken('ana', ['USUARIO']).token;
    expect(t.tokenService.verifyMfaToken(access, 'login')).toBeNull();
  });
});
