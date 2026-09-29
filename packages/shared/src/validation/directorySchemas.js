import { z } from 'zod';

import { COMPETITION_CATEGORY } from '../constants/competition.js';

/** Filters of the staff directory (/staff/jugadores). Query strings, so values are text. */
export const DIRECTORY_MEMBERSHIP_FILTERS = Object.freeze(['ACTIVE', 'PENDING', 'OVERDUE', 'NONE']);

export const directoryQuerySchema = z.object({
  tab: z.enum(['players', 'all']).default('players'),
  q: z.string().trim().max(100).optional(),
  membership: z.enum(DIRECTORY_MEMBERSHIP_FILTERS).optional(),
  category: z.enum(Object.values(COMPETITION_CATEGORY)).optional(),
  minor: z.enum(['true']).optional(),
  pendingGuardian: z.enum(['true']).optional(),
  account: z.enum(['active', 'deactivated']).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
});

export const DIRECTORY_PAGE_SIZE = 25;
