import { describe, expect, it, vi } from 'vitest';

import { requireRole } from '../../../../src/modules/identity/infrastructure/http/middleware/requireRole.js';

function buildReqRes(roles) {
  const req = { user: roles ? { roles } : null };
  const res = {};
  const next = vi.fn();
  return { req, res, next };
}

describe('requireRole', () => {
  it('allows a single-role-code call when the user has that role (regression)', () => {
    const { req, res, next } = buildReqRes(['ADMINISTRADOR']);
    requireRole('ADMINISTRADOR')(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects a single-role-code call when the user lacks that role', () => {
    const { req, res, next } = buildReqRes(['USUARIO']);
    requireRole('ADMINISTRADOR')(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
  });

  it('allows an array call when the user has any one of the listed roles', () => {
    const { req, res, next } = buildReqRes(['RECEPCION']);
    requireRole(['ADMINISTRADOR', 'RECEPCION'])(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects an array call when the user has none of the listed roles', () => {
    const { req, res, next } = buildReqRes(['USUARIO']);
    requireRole(['ADMINISTRADOR', 'RECEPCION'])(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
  });

  it('rejects when there is no authenticated user at all', () => {
    const { req, res, next } = buildReqRes(null);
    requireRole(['ADMINISTRADOR'])(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
  });
});
