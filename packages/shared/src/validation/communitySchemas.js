import { z } from 'zod';

export const createPostSchema = z.object({
  content: z.string().trim().min(1).max(1000),
});

/** A video already uploaded to Blob by the browser (client upload). */
export const postVideoRefSchema = z.object({
  url: z.string().url(),
  durationSeconds: z.number().positive().max(60),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

/** Text fields of a post with media (multipart): text is optional there. */
export const createMediaPostFieldsSchema = z.object({
  content: z.string().trim().max(1000).default(''),
  video: postVideoRefSchema.optional(),
});

/** What the browser declares before a direct video upload is signed. */
export const videoUploadRequestSchema = z.object({
  contentType: z.enum(['video/mp4', 'video/webm']),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(50 * 1024 * 1024),
  durationSeconds: z.number().positive().max(60),
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
