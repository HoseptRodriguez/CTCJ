import { z } from 'zod';

import { AFFILIATION_REQUEST_STATUS } from '../constants/affiliationRequest.js';

export const requestAffiliationSchema = z.object({
  notes: z.string().max(500).optional(),
});

export const decideAffiliationRequestSchema = z.object({
  decision: z.enum([AFFILIATION_REQUEST_STATUS.APPROVED, AFFILIATION_REQUEST_STATUS.REJECTED]),
  notes: z.string().max(500).optional(),
});
