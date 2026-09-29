import { z } from 'zod';

import {
  INFO_REQUEST_FOR,
  INFO_REQUEST_MESSAGE_MAX,
  INFO_REQUEST_PROGRAM,
  INFO_REQUEST_STATUS,
  INFO_REQUEST_TIMES,
  normalizeColombianPhone,
} from '../constants/infoRequests.js';

/** The public form. Messages say what to fix, in plain Spanish. */
export const infoRequestSchema = z
  .object({
    fullName: z
      .string({ required_error: 'Escribe tu nombre completo.' })
      .trim()
      .min(3, 'Escribe tu nombre completo.')
      .max(120, 'Máximo 120 caracteres.'),
    phone: z
      .string({ required_error: 'Escribe tu celular o WhatsApp.' })
      .trim()
      .refine((v) => normalizeColombianPhone(v) != null, {
        message: 'Escribe un celular colombiano de 10 números, por ejemplo 310 123 4567.',
      }),
    email: z
      .string()
      .trim()
      .max(160)
      .email('Revisa el correo, por ejemplo nombre@correo.com.')
      .optional()
      .or(z.literal('')),
    program: z.enum(Object.values(INFO_REQUEST_PROGRAM), {
      errorMap: () => ({ message: 'Elige el programa que te interesa.' }),
    }),
    forWhom: z.enum(Object.values(INFO_REQUEST_FOR), {
      errorMap: () => ({ message: 'Elige para quién es.' }),
    }),
    childAge: z.coerce
      .number({ invalid_type_error: 'Escribe la edad en números.' })
      .int('Escribe la edad en números.')
      .min(1, 'Escribe una edad entre 1 y 17 años.')
      .max(17, 'Escribe una edad entre 1 y 17 años.')
      .optional(),
    preferredTimes: z
      .array(z.enum(Object.keys(INFO_REQUEST_TIMES)))
      .max(4)
      .default([]),
    message: z
      .string()
      .trim()
      .max(INFO_REQUEST_MESSAGE_MAX, `Máximo ${INFO_REQUEST_MESSAGE_MAX} caracteres.`)
      .optional()
      .or(z.literal('')),
    acceptPrivacy: z.literal(true, {
      errorMap: () => ({
        message: 'Para enviar la solicitud debes autorizar el uso de tus datos.',
      }),
    }),
    marketing: z.boolean().default(false),
    // Anti-spam, without third parties: a signed form token and a trap field.
    formToken: z.string().min(10).max(500),
    website: z.string().max(200).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.forWhom === INFO_REQUEST_FOR.CHILD && v.childAge == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['childAge'],
        message: 'Escribe la edad del niño o niña.',
      });
    }
  });

export const infoRequestListQuerySchema = z.object({
  status: z.enum(Object.values(INFO_REQUEST_STATUS)).optional(),
  program: z.enum(Object.values(INFO_REQUEST_PROGRAM)).optional(),
});

export const infoRequestStatusSchema = z.object({
  status: z.enum(Object.values(INFO_REQUEST_STATUS)),
});

export const infoRequestNoteSchema = z.object({
  text: z.string().trim().min(1, 'Escribe la nota.').max(1000, 'Máximo 1000 caracteres.'),
});
