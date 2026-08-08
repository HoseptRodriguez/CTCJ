import { z } from 'zod';

import { GOAL_METRIC_TYPE } from '../constants/goals.js';

import { PERFORMANCE_AREAS } from './coachingSchemas.js';

const CATEGORIES = ['SEGUNDA', 'TERCERA', 'CUARTA', 'QUINTA'];
const MODALITIES = ['SINGLES', 'DOBLES'];

// Type/range shape only -- which fields are actually *required* depends on
// metricType (e.g. SKILL_RATING needs targetArea, CUSTOM needs nothing but
// a title), enforced by goalTargetPolicy.js on the domain side rather than
// duplicated here, matching how avatarPolicy.js's mimetype check is
// re-verified at the use-case layer instead of trusted from just one
// boundary.
export const createGoalSchema = z.object({
  title: z.string().trim().min(1).max(200),
  metricType: z.enum(Object.values(GOAL_METRIC_TYPE)),
  targetArea: z.enum(PERFORMANCE_AREAS).optional(),
  targetValue: z.number().int().min(1).max(1000).optional(),
  targetCategory: z.enum(CATEGORIES).optional(),
  targetModality: z.enum(MODALITIES).optional(),
});
