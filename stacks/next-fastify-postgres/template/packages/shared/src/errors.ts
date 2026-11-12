import { z } from 'zod';

/** Every non-2xx API response has this body. */
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

/** Stable machine-readable error codes. Extend, never rename. */
export const ErrorCode = {
  BadRequest: 'BAD_REQUEST',
  ValidationError: 'VALIDATION_ERROR',
  Unauthenticated: 'UNAUTHENTICATED',
  InvalidCredentials: 'INVALID_CREDENTIALS',
  Forbidden: 'FORBIDDEN',
  NotFound: 'NOT_FOUND',
  MethodNotAllowed: 'METHOD_NOT_ALLOWED',
  RequestTimeout: 'REQUEST_TIMEOUT',
  PayloadTooLarge: 'PAYLOAD_TOO_LARGE',
  UnsupportedMediaType: 'UNSUPPORTED_MEDIA_TYPE',
  RateLimited: 'RATE_LIMITED',
  EmailTaken: 'EMAIL_TAKEN',
  Conflict: 'CONFLICT',
  Internal: 'INTERNAL',
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
