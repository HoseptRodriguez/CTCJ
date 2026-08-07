import { config } from '../../../../config/env.js';
import { InvalidRefreshToken } from '../../application/errors/InvalidRefreshToken.js';

import { mapIdentityError } from './errorMapping.js';

function asyncHandler(fn) {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => next(mapIdentityError(err)));
  };
}

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: config.refreshToken.ttlDays * 24 * 60 * 60 * 1000,
  };
}

/** @param {ReturnType<import('../compositionRoot.js').buildIdentityContainer>} container */
export function createAuthController(container) {
  const register = asyncHandler(async (req, res) => {
    await container.registerUser(req.body);
    res.status(201).end();
  });

  const login = asyncHandler(async (req, res) => {
    const result = await container.loginUser({
      ...req.body,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.cookie(config.refreshToken.cookieName, result.refreshToken, refreshCookieOptions());
    res.status(200).json({
      accessToken: result.accessToken,
      expiresIn: result.expiresInSeconds,
      tokenType: 'Bearer',
      roles: result.roles,
    });
  });

  const refresh = asyncHandler(async (req, res, next) => {
    const rawRefreshToken = req.cookies?.[config.refreshToken.cookieName];
    if (!rawRefreshToken) {
      return next(mapIdentityError(new InvalidRefreshToken()));
    }
    const result = await container.refreshSession({
      rawRefreshToken,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.cookie(config.refreshToken.cookieName, result.refreshToken, refreshCookieOptions());
    return res.status(200).json({
      accessToken: result.accessToken,
      expiresIn: result.expiresInSeconds,
      tokenType: 'Bearer',
      roles: null,
    });
  });

  const verify = asyncHandler(async (req, res) => {
    await container.verifyEmail({ rawToken: req.query.token });
    res.status(200).json({ verified: true });
  });

  const requestPasswordReset = asyncHandler(async (req, res) => {
    await container.requestPasswordReset({ email: req.body.email, ip: req.ip });
    res.status(200).json({ requested: true });
  });

  const confirmPasswordReset = asyncHandler(async (req, res) => {
    await container.confirmPasswordReset({
      rawToken: req.body.token,
      newPassword: req.body.newPassword,
    });
    res.status(200).json({ reset: true });
  });

  const logout = asyncHandler(async (req, res) => {
    const rawRefreshToken = req.cookies?.[config.refreshToken.cookieName];
    await container.logoutUser({ rawRefreshToken });
    res.clearCookie(config.refreshToken.cookieName, { path: '/api/auth' });
    res.status(204).end();
  });

  return {
    register,
    login,
    refresh,
    verify,
    logout,
    requestPasswordReset,
    confirmPasswordReset,
  };
}
