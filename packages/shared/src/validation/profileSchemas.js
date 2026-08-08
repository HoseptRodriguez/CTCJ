import { z } from 'zod';

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
});
