import { describe, expect, it } from 'vitest';

import { User } from '../../../../src/modules/identity/domain/entities/User.js';
import { createStaffAccountActions } from '../../../../src/modules/identity/application/useCases/staffAccountActions.js';
import { AccountAnonymized } from '../../../../src/modules/identity/application/errors/AccountAnonymized.js';
import { CannotChangeOwnAccount } from '../../../../src/modules/identity/application/errors/CannotChangeOwnAccount.js';
import { EmailAlreadyVerified } from '../../../../src/modules/identity/application/errors/EmailAlreadyVerified.js';
import { RoleAlreadyAssigned } from '../../../../src/modules/identity/application/errors/RoleAlreadyAssigned.js';

const NOW = new Date('2026-09-29T15:00:00Z');
const ADMIN = { userId: 'admin', roles: ['USUARIO', 'ADMINISTRADOR'] };

function setup(users) {
  const byId = new Map(users.map((u) => [u.id, u]));
  const log = [];
  const calls = { revokedTokens: [], emails: [], grants: [], revokes: [] };
  const actions = createStaffAccountActions({
    userRepository: {
      findById: async (id) => byId.get(id) ?? null,
      update: async (u) => byId.set(u.id, u) && u,
      addRoleGrant: async (...a) => calls.grants.push(a),
      revokeRoleGrant: async (...a) => calls.revokes.push(a),
    },
    refreshTokenRepository: { revokeAllForUser: async (id) => calls.revokedTokens.push(id) },
    emailVerificationRepository: { create: async () => {} },
    emailSender: { sendVerificationEmail: async (to, url) => calls.emails.push({ to, url }) },
    tokenService: { generateOpaqueToken: () => 'raw', hashOpaqueToken: () => 'hash' },
    auditLog: { record: async (e) => log.push(e) },
    clock: { now: () => NOW },
    appPublicUrl: 'http://club.test',
  });
  return { actions, log, calls, byId };
}

const person = (over = {}) =>
  new User({
    id: 'ana',
    clubId: 'c',
    email: 'ana@example.com',
    passwordHash: 'h',
    firstName: 'Ana',
    lastName: 'Gómez',
    status: 'ACTIVE',
    roleCodes: ['USUARIO'],
    emailVerifiedAt: NOW,
    ...over,
  });

describe('staff account actions', () => {
  it('gives and takes the player role, recorded in audit_logs', async () => {
    const { actions, log, calls } = setup([person()]);
    await actions.setPlayerRole({ actor: ADMIN, userId: 'ana', grant: true });
    expect(calls.grants).toEqual([['ana', 'JUGADOR', 'admin']]);
    await expect(
      actions.setPlayerRole({ actor: ADMIN, userId: 'ana', grant: true }),
    ).rejects.toBeInstanceOf(RoleAlreadyAssigned);
    await actions.setPlayerRole({ actor: ADMIN, userId: 'ana', grant: false });
    expect(calls.revokes).toEqual([['ana', 'JUGADOR', 'admin']]);
    expect(log.map((e) => e.action)).toEqual(['user.role.grant', 'user.role.revoke']);
    expect(log[0]).toMatchObject({
      actorUserId: 'admin',
      entityType: 'user',
      entityId: 'ana',
      before: { roles: ['USUARIO'] },
      after: { roles: ['USUARIO', 'JUGADOR'] },
    });
  });

  it('deactivating closes the sessions; reactivating returns to verified or pending', async () => {
    const { actions, log, calls, byId } = setup([
      person(),
      person({
        id: 'nuevo',
        email: 'nuevo@example.com',
        emailVerifiedAt: null,
        status: 'PENDING_VERIFICATION',
      }),
    ]);
    await actions.setAccountActive({ actor: ADMIN, userId: 'ana', active: false });
    expect(byId.get('ana').status).toBe('DEACTIVATED');
    expect(calls.revokedTokens).toEqual(['ana']);
    await actions.setAccountActive({ actor: ADMIN, userId: 'ana', active: true });
    expect(byId.get('ana').status).toBe('ACTIVE');
    await actions.setAccountActive({ actor: ADMIN, userId: 'nuevo', active: false });
    await actions.setAccountActive({ actor: ADMIN, userId: 'nuevo', active: true });
    expect(byId.get('nuevo').status).toBe('PENDING_VERIFICATION');
    expect(log[0]).toMatchObject({
      action: 'user.deactivate',
      before: { status: 'ACTIVE' },
      after: { status: 'DEACTIVATED' },
    });
  });

  it('nobody acts on their own account, and a deleted account never comes back', async () => {
    const { actions } = setup([person({ id: 'admin' }), person({ id: 'borrada', deletedAt: NOW })]);
    await expect(
      actions.setAccountActive({ actor: ADMIN, userId: 'admin', active: false }),
    ).rejects.toBeInstanceOf(CannotChangeOwnAccount);
    await expect(
      actions.setAccountActive({ actor: ADMIN, userId: 'borrada', active: true }),
    ).rejects.toBeInstanceOf(AccountAnonymized);
  });

  it('resends the verification email only to who has not confirmed', async () => {
    const { actions, log, calls } = setup([
      person(),
      person({ id: 'nuevo', email: 'nuevo@example.com', emailVerifiedAt: null }),
    ]);
    await expect(
      actions.resendVerification({ actor: ADMIN, userId: 'ana' }),
    ).rejects.toBeInstanceOf(EmailAlreadyVerified);
    await actions.resendVerification({ actor: ADMIN, userId: 'nuevo' });
    expect(calls.emails).toEqual([
      { to: 'nuevo@example.com', url: 'http://club.test/verify-email?token=raw' },
    ]);
    expect(log.at(-1)).toMatchObject({ action: 'user.verification.resend', entityId: 'nuevo' });
  });

  it('an export is recorded with its filters and size', async () => {
    const { actions, log } = setup([]);
    await actions.recordDirectoryExport({ actor: ADMIN, filters: { tab: 'all' }, rows: 12 });
    expect(log[0]).toMatchObject({
      action: 'users.export',
      entityType: 'user_directory',
      entityId: null,
      after: { filters: { tab: 'all' }, rows: 12 },
    });
  });
});
