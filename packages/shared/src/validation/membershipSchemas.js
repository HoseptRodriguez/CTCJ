import { z } from 'zod';

import { MEMBERSHIP_STATUS } from '../constants/membership.js';

export const setMembershipStatusSchema = z.object({
  status: z.nativeEnum(MEMBERSHIP_STATUS).nullable(),
});

export const lookupUserQuerySchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const overduePolicySchema = z.object({
  enabled: z.boolean(),
});
