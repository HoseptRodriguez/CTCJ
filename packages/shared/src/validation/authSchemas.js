import { z } from 'zod';

import { ROLE_CODES } from '../constants/roles.js';

/** Password length bounds ported verbatim from v7's identity module. */
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 100;

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const grantRoleSchema = z.object({
  userId: z.string().uuid(),
  roleCode: z.nativeEnum(ROLE_CODES),
});

export const verifyEmailQuerySchema = z.object({
  token: z.string().min(1),
});
