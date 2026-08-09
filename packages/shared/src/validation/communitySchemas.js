import { z } from 'zod';

export const createPostSchema = z.object({
  content: z.string().trim().min(1).max(1000),
});

export const createCommentSchema = z.object({
  content: z.string().trim().min(1).max(500),
});

export const reportContentSchema = z.object({
  reason: z.string().trim().max(300).optional(),
});

export const listReportedContentQuerySchema = z.object({
  status: z.enum(['PENDING', 'DISMISSED']).optional(),
});
