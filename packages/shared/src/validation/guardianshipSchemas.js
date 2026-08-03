import { z } from 'zod';

import { GUARDIANSHIP_STATUS } from '../constants/guardianship.js';

export const requestGuardianshipSchema = z.object({
  minorEmail: z.string().trim().toLowerCase().email(),
  canPay: z.boolean(),
  canBook: z.boolean(),
});

export const decideGuardianshipSchema = z.object({
  decision: z.enum([GUARDIANSHIP_STATUS.APPROVED, GUARDIANSHIP_STATUS.REJECTED]),
  notes: z.string().max(500).optional(),
});
