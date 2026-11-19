import { headers } from 'next/headers';
import { cache } from 'react';
import { authResponseSchema, devMailListResponseSchema, type DevMail, type User } from '@app/shared';

import { REQUEST_TIMEOUT_MS } from './api-constants';

// Server Components call the API directly (not via the rewrite), forwarding the user's cookie.
const API_URL = process.env.API_URL ?? `http://localhost:${process.env.API_PORT ?? '4000'}`;

const apiFetch = async (path: string): Promise<Response> => {
  const cookie = (await headers()).get('cookie') ?? '';

  return fetch(`${API_URL}${path}`, { headers: { cookie }, cache: 'no-store', signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
};

/**
 * The signed-in user, or null. Use in protected pages: `if (!user) redirect('/login')`. Cached per
 * request, so the (app) layout and the page share one call.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const res = await apiFetch('/auth/me');

  if (res.status === 401) return null;

  if (!res.ok) throw new Error(`GET /auth/me failed with ${res.status}`);

  return authResponseSchema.parse(await res.json()).user;
});

/** Dev-only outbox for the signed-in user; null when signed out or when the API has no /dev routes (production). */
export const getDevMail = async (): Promise<DevMail[] | null> => {
  const res = await apiFetch('/dev/mail');

  if (res.status === 401 || res.status === 404) return null;

  if (!res.ok) throw new Error(`GET /dev/mail failed with ${res.status}`);

  return devMailListResponseSchema.parse(await res.json()).mail;
};
