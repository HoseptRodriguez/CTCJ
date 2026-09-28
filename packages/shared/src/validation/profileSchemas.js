import { z } from 'zod';

import { DOCUMENT_TYPE } from '../constants/identityDocument.js';
import { BACKHAND, DOMINANT_HAND } from '../constants/playStyle.js';

// All fields optional (partial PATCH) and nullable (explicit null clears the
// field) -- omitting a key entirely leaves it untouched, matching
// User.updateProfile()'s `undefined`-means-unchanged contract.
export const updateMyProfileSchema = z.object({
  phone: z.string().trim().min(1).max(30).nullable().optional(),
  birthDate: z
    .string()
    .date()
    .transform((value) => new Date(value))
    .nullable()
    .optional(),
  bio: z.string().trim().max(500).nullable().optional(),
  dominantHand: z.nativeEnum(DOMINANT_HAND).nullable().optional(),
  backhand: z.nativeEnum(BACKHAND).nullable().optional(),
});

// Staff only (reception): both set, or both cleared.
export const setUserDocumentSchema = z
  .object({
    documentType: z.nativeEnum(DOCUMENT_TYPE).nullable(),
    documentNumber: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9-]{3,20}$/, 'Escribe el número sin puntos ni espacios.')
      .nullable(),
  })
  .refine((d) => (d.documentType == null) === (d.documentNumber == null), {
    message: 'Escribe el tipo y el número del documento, o deja ambos vacíos.',
  });

/** The visitor's cookie decision, recorded as proof for signed-in users. */
export const recordCookieConsentSchema = z.object({
  preferences: z.boolean(),
  analytics: z.boolean(),
  policyVersion: z.string().trim().min(1).max(20),
});

/** Channels a person can choose for promotions (Ley 2300 de 2023). */
export const MARKETING_CHANNELS = Object.freeze(['email', 'whatsapp']);

/** Accept or withdraw an optional authorization from "Mis datos y privacidad". */
export const setAuthorizationSchema = z.object({
  accept: z.boolean(),
  channels: z.array(z.enum(MARKETING_CHANNELS)).max(2).optional(),
});

/** The guardian accepts or withdraws an authorization for a linked minor. */
export const setGuardianAuthorizationSchema = z.object({ accept: z.boolean() });
