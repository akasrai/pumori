import type { z } from 'zod';
import { apiErrorSchema, type ApiError } from '@app/shared';

import { CLIENT_ERROR, CLIENT_ERROR_MESSAGES, REQUEST_TIMEOUT_MS } from './api-constants';

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: ApiError['error'] };

const isTimeout = (err: unknown): boolean => err instanceof DOMException && err.name === 'TimeoutError';

/**
 * Browser-side API call. Always goes through the same-origin /api/* rewrite and gives up after
 * REQUEST_TIMEOUT_MS. Never throws: network failures, timeouts, error responses and responses that
 * do not match the shared schema all come back as `{ ok: false, error }`.
 */
export const apiRequest = async <S extends z.ZodType>(
  path: `/api/${string}`,
  init: { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown },
  schema: S,
): Promise<ApiResult<z.output<S>>> => {
  let res: Response;
  let json: unknown;

  try {
    res = await fetch(path, {
      method: init.method ?? 'GET',
      headers: init.body === undefined ? {} : { 'content-type': 'application/json' },
      body: init.body === undefined ? null : JSON.stringify(init.body),
      credentials: 'same-origin',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    json = res.status === 204 ? undefined : await res.json().catch(() => undefined);
  } catch (err) {
    return isTimeout(err)
      ? { ok: false, status: 0, error: { code: CLIENT_ERROR.TIMEOUT, message: CLIENT_ERROR_MESSAGES.TIMEOUT } }
      : { ok: false, status: 0, error: { code: CLIENT_ERROR.NETWORK, message: CLIENT_ERROR_MESSAGES.NETWORK } };
  }

  if (!res.ok) {
    const parsed = apiErrorSchema.safeParse(json);

    return {
      ok: false,
      status: res.status,
      error: parsed.success ? parsed.data.error : { code: CLIENT_ERROR.HTTP, message: `Request failed (${res.status})` },
    };
  }
  const parsed = schema.safeParse(json);

  if (!parsed.success) {
    return { ok: false, status: res.status, error: { code: CLIENT_ERROR.INVALID_RESPONSE, message: CLIENT_ERROR_MESSAGES.INVALID_RESPONSE } };
  }

  return { ok: true, data: parsed.data };
};
