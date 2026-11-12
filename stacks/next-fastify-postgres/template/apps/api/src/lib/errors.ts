import { ErrorCode, type ApiError } from '@app/shared';

type Details = NonNullable<ApiError['error']['details']>;

/** Throw an AppError anywhere in a handler/hook; the error handler turns it into {error:{code,message}}. */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details: Details | undefined;

  constructor(statusCode: number, code: string, message: string, details?: Details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: Details) =>
  new AppError(400, ErrorCode.ValidationError, message, details);
export const unauthenticated = (message = 'Authentication required') =>
  new AppError(401, ErrorCode.Unauthenticated, message);
/** Use for resources that do not exist OR belong to another user (never reveal existence). */
export const notFound = (what = 'Resource') => new AppError(404, ErrorCode.NotFound, `${what} not found`);
export const conflict = (code: string, message: string) => new AppError(409, code, message);
