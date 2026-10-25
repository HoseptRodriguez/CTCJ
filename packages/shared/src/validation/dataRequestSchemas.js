import { z } from 'zod';

import { DATA_REQUEST_KIND, DATA_REQUEST_STATUS } from '../constants/dataRequests.js';

export const submitDataRequestSchema = z.object({
  kind: z.enum(Object.values(DATA_REQUEST_KIND), {
    errorMap: () => ({ message: 'Elige el tipo de solicitud.' }),
  }),
  description: z
    .string({ required_error: 'Cuéntanos qué necesitas.' })
    .trim()
    .min(10, 'Cuéntanos qué necesitas (al menos 10 caracteres).')
    .max(4000, 'Máximo 4000 caracteres.'),
});

export const answerDataRequestSchema = z
  .object({
    status: z.enum([DATA_REQUEST_STATUS.EN_TRAMITE, DATA_REQUEST_STATUS.RESPONDIDA]),
    answer: z.string().trim().max(4000).optional(),
    // Only for a SUPRESION request: anonymize the account when answering.
    eraseAccount: z.boolean().optional(),
  })
  .refine((v) => v.status !== DATA_REQUEST_STATUS.RESPONDIDA || (v.answer ?? '').length >= 5, {
    message: 'Escribe la respuesta que recibirá la persona.',
    path: ['answer'],
  });
