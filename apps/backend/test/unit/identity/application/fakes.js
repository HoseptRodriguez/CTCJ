import { randomUUID } from 'node:crypto';

import { ROLE_DEFINITIONS } from '@ctcj/shared';

export function createFakeUserRepository() {
  const byId = new Map();

  return {
    async findById(id) {
      return byId.get(id) ?? null;
    },
    async findByEmail(_clubId, email) {
      for (const user of byId.values()) {
        if (user.email === email) return user;
      }
      return null;
    },
    async findByIds(ids) {
      return ids
        .map((id) => byId.get(id))
        .filter(Boolean)
        .map((user) => ({
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        }));
    },
    async existsByEmail(_clubId, email) {
      for (const user of byId.values()) {
        if (user.email === email) return true;
      }
      return false;
    },
    async create(user) {
      byId.set(user.id, user);
      return user;
    },
    async update(user) {
      byId.set(user.id, user);
      return user;
    },
    async addRoleGrant(userId, roleCode, grantedByUserId) {
      this.roleGrants = this.roleGrants ?? [];
      this.roleGrants.push({ userId, roleCode, grantedByUserId });
    },
  };
}

export function createFakeRoleRepository() {
  const roles = new Map(
    ROLE_DEFINITIONS.map((r) => [
      r.code,
      {
        id: `role-${r.code}`,
        code: r.code,
        selfAssignable: r.selfAssignable,
        requiresMfa: r.requiresMfa,
      },
    ]),
  );
  return {
    async findByCode(code) {
      return roles.get(code) ?? null;
    },
  };
}

export function createFakeRefreshTokenRepository() {
  const byId = new Map();
  const idByHash = new Map();

  return {
    async create(userId, tokenHash, familyId, expiresAt, ipAddress, userAgent) {
      const id = randomUUID();
      byId.set(id, {
        id,
        userId,
        tokenHash,
        familyId,
        expiresAt,
        revokedAt: null,
        replacedBy: null,
        ipAddress,
        userAgent,
      });
      idByHash.set(tokenHash, id);
      return { id, familyId, expiresAt };
    },
    async findByHash(tokenHash) {
      const id = idByHash.get(tokenHash);
      return id ? { ...byId.get(id) } : null;
    },
    async rotate(oldTokenId, newTokenHash, expiresAt, ipAddress, userAgent) {
      const old = byId.get(oldTokenId);
      const newId = randomUUID();
      byId.set(newId, {
        id: newId,
        userId: old.userId,
        tokenHash: newTokenHash,
        familyId: old.familyId,
        expiresAt,
        revokedAt: null,
        replacedBy: null,
        ipAddress,
        userAgent,
      });
      idByHash.set(newTokenHash, newId);
      old.replacedBy = newId;
      return { id: newId };
    },
    async revokeFamily(familyId) {
      for (const record of byId.values()) {
        if (record.familyId === familyId && !record.revokedAt) {
          record.revokedAt = new Date();
        }
      }
    },
    async revokeById(tokenId) {
      const record = byId.get(tokenId);
      if (record) record.revokedAt = new Date();
    },
    async revokeAllForUser(userId) {
      for (const record of byId.values()) {
        if (record.userId === userId && !record.revokedAt) {
          record.revokedAt = new Date();
        }
      }
    },
  };
}

export function createFakeEmailVerificationRepository() {
  const byId = new Map();
  const idByHash = new Map();

  return {
    async create(userId, tokenHash, expiresAt) {
      const id = randomUUID();
      byId.set(id, { id, userId, tokenHash, expiresAt, consumedAt: null });
      idByHash.set(tokenHash, id);
      return { id };
    },
    async findByHash(tokenHash) {
      const id = idByHash.get(tokenHash);
      return id ? { ...byId.get(id) } : null;
    },
    async markConsumed(id) {
      const record = byId.get(id);
      if (record) record.consumedAt = new Date();
    },
  };
}

export function createFakePasswordResetRepository() {
  const byId = new Map();
  const idByHash = new Map();

  return {
    async create(userId, tokenHash, expiresAt, requestedIp) {
      const id = randomUUID();
      byId.set(id, { id, userId, tokenHash, expiresAt, consumedAt: null, requestedIp });
      idByHash.set(tokenHash, id);
      return { id };
    },
    async findByHash(tokenHash) {
      const id = idByHash.get(tokenHash);
      return id ? { ...byId.get(id) } : null;
    },
    async markConsumed(id) {
      const record = byId.get(id);
      if (record) record.consumedAt = new Date();
    },
  };
}

export function createFakePasswordHasher() {
  return {
    async hash(plainPassword) {
      return `hashed:${plainPassword}`;
    },
    async verify(plainPassword, hash) {
      return hash === `hashed:${plainPassword}`;
    },
  };
}

export function createFakeTokenService() {
  let counter = 0;
  return {
    issueAccessToken(userId, roleCodes) {
      return { token: `access:${userId}:${roleCodes.join(',')}`, expiresInSeconds: 900 };
    },
    generateRefreshToken() {
      counter += 1;
      return `refresh-raw-${counter}`;
    },
    hashRefreshToken(rawToken) {
      return `hash:${rawToken}`;
    },
    generateOpaqueToken() {
      counter += 1;
      return `opaque-raw-${counter}`;
    },
    hashOpaqueToken(rawToken) {
      return `hash:${rawToken}`;
    },
  };
}

export function createFakeEmailSender() {
  const sent = [];
  const passwordResetsSent = [];
  return {
    sent,
    passwordResetsSent,
    async sendVerificationEmail(toEmail, verificationUrl) {
      sent.push({ toEmail, verificationUrl });
    },
    async sendPasswordResetEmail(toEmail, resetUrl) {
      passwordResetsSent.push({ toEmail, resetUrl });
    },
  };
}

export function createFakeSystemSettingRepository() {
  const byKey = new Map(); // `${clubId}:${key}` -> { value, updatedAt, updatedBy }

  return {
    async findByKey(clubId, key) {
      return byKey.get(`${clubId}:${key}`) ?? null;
    },
    async set(clubId, key, value, updatedByUserId) {
      byKey.set(`${clubId}:${key}`, {
        value,
        updatedAt: new Date(),
        updatedBy: updatedByUserId ?? null,
      });
    },
  };
}

export function createFakeAffiliationRequestRepository() {
  const byId = new Map();
  let counter = 0;

  return {
    async create({ userId, notes }) {
      counter += 1;
      const id = `affiliation-request-${counter}`;
      const record = {
        id,
        userId,
        status: 'PENDING',
        requestedAt: new Date(),
        decidedAt: null,
        decidedBy: null,
        notes: notes ?? null,
        decisionNotes: null,
      };
      byId.set(id, record);
      return { ...record };
    },
    async findById(id) {
      const record = byId.get(id);
      return record ? { ...record } : null;
    },
    async findPendingForUser(userId) {
      for (const record of byId.values()) {
        if (record.userId === userId && record.status === 'PENDING') return { ...record };
      }
      return null;
    },
    async listByUser(userId) {
      return Array.from(byId.values())
        .filter((r) => r.userId === userId)
        .map((r) => ({ ...r }));
    },
    async listByStatus(status) {
      return Array.from(byId.values())
        .filter((r) => r.status === status)
        .map((r) => ({ ...r }));
    },
    async decide(id, status, decidedAt, decidedBy, decisionNotes) {
      const record = byId.get(id);
      record.status = status;
      record.decidedAt = decidedAt;
      record.decidedBy = decidedBy;
      record.decisionNotes = decisionNotes;
      return { ...record };
    },
  };
}

export function createFakeGuardianshipRepository() {
  const byId = new Map();
  let counter = 0;

  return {
    async create({ guardianUserId, minorUserId, canPay, canBook }) {
      counter += 1;
      const id = `guardianship-${counter}`;
      const record = {
        id,
        guardianUserId,
        minorUserId,
        canPay,
        canBook,
        status: 'PENDING',
        requestedAt: new Date(),
        decidedAt: null,
        decidedBy: null,
        decisionNotes: null,
      };
      byId.set(id, record);
      return { ...record };
    },
    async findById(id) {
      const record = byId.get(id);
      return record ? { ...record } : null;
    },
    async findActiveForPair(guardianUserId, minorUserId) {
      for (const record of byId.values()) {
        if (
          record.guardianUserId === guardianUserId &&
          record.minorUserId === minorUserId &&
          (record.status === 'PENDING' || record.status === 'APPROVED')
        ) {
          return { ...record };
        }
      }
      return null;
    },
    async existsApprovedBookable(guardianUserId, minorUserId) {
      for (const record of byId.values()) {
        if (
          record.guardianUserId === guardianUserId &&
          record.minorUserId === minorUserId &&
          record.status === 'APPROVED' &&
          record.canBook
        ) {
          return true;
        }
      }
      return false;
    },
    async listByGuardian(guardianUserId) {
      return Array.from(byId.values())
        .filter((r) => r.guardianUserId === guardianUserId)
        .map((r) => ({ ...r }));
    },
    async listByStatus(status) {
      return Array.from(byId.values())
        .filter((r) => r.status === status)
        .map((r) => ({ ...r }));
    },
    async decide(id, status, decidedAt, decidedBy, decisionNotes) {
      const record = byId.get(id);
      record.status = status;
      record.decidedAt = decidedAt;
      record.decidedBy = decidedBy;
      record.decisionNotes = decisionNotes;
      return { ...record };
    },
  };
}

export function createFakeClock(initial) {
  let current = initial;
  return {
    now: () => current,
    set: (date) => {
      current = date;
    },
    advanceMs: (ms) => {
      current = new Date(current.getTime() + ms);
    },
  };
}
