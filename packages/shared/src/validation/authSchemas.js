import { z } from 'zod';

import { ROLE_CODES } from '../constants/roles.js';

/** Password length bounds ported verbatim from v7's identity module. */
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 100;

/**
 * Real password policy: length bounds plus at least one letter and one
 * digit -- long enough to resist guessing, capped so a pathological input
 * can't be used to burn CPU in argon2 hashing. Shared by registration and
 * password reset so both entry points enforce the exact same rule.
 */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `La clave debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`)
  .max(PASSWORD_MAX_LENGTH, `La clave no puede tener más de ${PASSWORD_MAX_LENGTH} caracteres.`)
  .regex(/[A-Za-z]/, 'La clave debe incluir al menos una letra.')
  .regex(/[0-9]/, 'La clave debe incluir al menos un número.');

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: passwordSchema,
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const requestPasswordResetSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const confirmPasswordResetSchema = z.object({
  token: z.string().min(1),
  newPassword: passwordSchema,
});

export const grantRoleSchema = z.object({
  userId: z.string().uuid(),
  roleCode: z.nativeEnum(ROLE_CODES),
});

export const verifyEmailQuerySchema = z.object({
  token: z.string().min(1),
});
