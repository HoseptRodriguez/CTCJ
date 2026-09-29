import { z } from 'zod';

const code = z
  .string({ required_error: 'Escribe el código de 6 números.' })
  .trim()
  .regex(/^\d{3}\s?\d{3}$/, 'El código tiene 6 números.');
const recoveryCode = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9]{4}-?[A-Za-z0-9]{4}$/, 'El código de recuperación tiene 8 letras y números.');

/** Signing in: the code of the app, or one of the recovery codes. */
export const mfaVerifySchema = z
  .object({
    mfaToken: z.string().min(10),
    code: code.optional(),
    recoveryCode: recoveryCode.optional(),
  })
  .refine((v) => Boolean(v.code) !== Boolean(v.recoveryCode), {
    message: 'Escribe el código de la aplicación o un código de recuperación.',
  });

export const mfaSetupStartSchema = z.object({ mfaToken: z.string().min(10) });
export const mfaSetupConfirmSchema = z.object({ mfaToken: z.string().min(10), code });

/** From a signed-in session (profile). */
export const mfaCodeSchema = z.object({ code });
