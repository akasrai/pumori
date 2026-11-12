import { z } from 'zod';

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address').max(254));

export const signupInputSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
});
export type SignupInput = z.infer<typeof signupInputSchema>;

export const loginInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(128),
});
export type LoginInput = z.infer<typeof loginInputSchema>;

/** Public user representation. Never add secrets (password hash, tokens) here. */
export const userSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  createdAt: z.iso.datetime({ offset: true }),
});
export type User = z.infer<typeof userSchema>;

/** Response body of POST /auth/signup, POST /auth/login and GET /auth/me. */
export const authResponseSchema = z.object({ user: userSchema });
export type AuthResponse = z.infer<typeof authResponseSchema>;
