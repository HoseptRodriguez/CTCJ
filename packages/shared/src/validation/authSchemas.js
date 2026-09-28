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

/**
 * Birth date (YYYY-MM-DD): required at sign-up. It tells whether the person
 * is a minor, whose account then waits for the guardian's authorization
 * (explained in the privacy policy, section 2).
 */
export const birthDateSchema = z
  .string({ required_error: 'Escribe tu fecha de nacimiento.' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Escribe tu fecha de nacimiento.')
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), 'Esa fecha no existe.')
  .refine((v) => v >= '1900-01-01', 'Revisa el año de nacimiento.')
  .refine(
    (v) => new Date(`${v}T00:00:00Z`) < new Date(),
    'La fecha de nacimiento no puede ser futura.',
  );

/**
 * Sign-up: the two required authorizations must be explicitly ticked
 * (never pre-ticked); promotions are optional and by chosen channel.
 */
export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: passwordSchema,
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  birthDate: birthDateSchema,
  acceptPrivacy: z.literal(true, {
    errorMap: () => ({
      message: 'Debes autorizar el tratamiento de tus datos para crear la cuenta.',
    }),
  }),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'Debes aceptar los Términos y condiciones para crear la cuenta.' }),
  }),
  marketing: z
    .object({ email: z.boolean().default(false), whatsapp: z.boolean().default(false) })
    .default({ email: false, whatsapp: false }),
});

/** Existing accounts, at their next sign-in: what's missing before they continue. */
export const completeAccountSchema = z.object({
  birthDate: birthDateSchema.optional(),
  acceptPrivacy: z.literal(true).optional(),
  acceptTerms: z.literal(true).optional(),
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
