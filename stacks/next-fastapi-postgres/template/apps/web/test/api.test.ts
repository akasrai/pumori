import { describe, expect, it, vi } from 'vitest';
import { authResponseSchema } from '@app/shared';
import { apiRequest } from '@/lib/api';

const jsonResponse = (body: unknown, status = 200) => {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
};

describe('apiRequest', () => {
  it('returns an INVALID_RESPONSE error instead of throwing when the body does not match the schema', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ user: { id: 'not-a-uuid' } }));

    const result = await apiRequest('/api/auth/me', {}, authResponseSchema);

    expect(result).toEqual({
      ok: false,
      status: 200,
      error: { code: 'INVALID_RESPONSE', message: 'Unexpected response from the server' },
    });
  });

  it('passes a timeout signal to fetch and reports a timeout as TIMEOUT', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new DOMException('timed out', 'TimeoutError'));

    const result = await apiRequest('/api/auth/me', {}, authResponseSchema);

    expect(fetchSpy.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
    expect(result).toMatchObject({ ok: false, error: { code: 'TIMEOUT' } });
  });

  it('reports an unreachable server as NETWORK_ERROR', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('fetch failed'));

    const result = await apiRequest('/api/auth/me', {}, authResponseSchema);

    expect(result).toMatchObject({ ok: false, status: 0, error: { code: 'NETWORK_ERROR' } });
  });
});
