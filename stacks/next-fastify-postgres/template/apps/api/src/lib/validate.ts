import type { z } from 'zod';
import { badRequest } from './errors.ts';

/**
 * Validates untrusted input (body, params, query) against a shared zod schema.
 * Throws a 400 VALIDATION_ERROR with per-field details on failure.
 */
export const parse = <S extends z.ZodType>(schema: S, input: unknown): z.output<S> => {
  const result = schema.safeParse(input ?? {});

  if (result.success) return result.data;
  const details = result.error.issues.map((issue) => ({
    path: issue.path.map(String).join('.'),
    message: issue.message,
  }));
  const first = details[0];
  let message = 'Invalid input';

  if (first) message = first.path ? `${first.path}: ${first.message}` : first.message;

  throw badRequest(message, details);
};
