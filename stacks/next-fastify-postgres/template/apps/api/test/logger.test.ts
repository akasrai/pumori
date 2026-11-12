import { randomBytes } from 'node:crypto';
import { Writable } from 'node:stream';
import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { buildLoggerOptions, redactUrl, serializeRequest } from '../src/lib/logger.ts';

// Generated, not a literal, so secret scanners have nothing to flag.
const TOKEN = randomBytes(32).toString('base64url');

describe('request log redaction', () => {
  it('redacts long token-like path segments', () => {
    expect(redactUrl(`/invites/${TOKEN}`)).toBe('/invites/[redacted]');
    expect(redactUrl(`/reset/${TOKEN}/confirm`)).toBe('/reset/[redacted]/confirm');
  });

  it('drops the whole query string', () => {
    expect(redactUrl('/auth/callback?code=abc&state=xyz')).toBe('/auth/callback?[redacted]');
  });

  it('keeps short segments and record UUIDs readable', () => {
    expect(redactUrl('/notes/7d9f8a2e-1b2c-4d5e-8f90-123456789abc')).toBe('/notes/7d9f8a2e-1b2c-4d5e-8f90-123456789abc');
    expect(redactUrl('/auth/me')).toBe('/auth/me');
  });

  it('the req serializer logs the redacted URL and no headers', () => {
    const out = serializeRequest({ method: 'GET', url: `/invites/${TOKEN}?t=1`, ip: '127.0.0.1', host: 'api' });

    expect(out).toEqual({ method: 'GET', url: '/invites/[redacted]?[redacted]', host: 'api', remoteAddress: '127.0.0.1', remotePort: undefined });
    expect(JSON.stringify(out)).not.toContain(TOKEN);
  });

  it('cookie and authorization headers are censored wherever they are logged', async () => {
    const lines: string[] = [];
    const stream = new Writable({
      write: (chunk: Buffer, _encoding, done) => {
        lines.push(chunk.toString());
        done();
      },
    });
    const app = Fastify({ logger: { ...buildLoggerOptions('info'), stream } });
    app.log.info({ headers: { cookie: 'sid=secret-cookie', authorization: 'Bearer secret-token', accept: 'json' } }, 'headers');
    app.log.info({ req: { headers: { cookie: 'sid=secret-cookie' } } }, 'request');
    await app.close();

    const output = lines.join('');

    expect(output).not.toContain('secret-cookie');
    expect(output).not.toContain('secret-token');
    expect(output).toContain('[redacted]');
    expect(output).toContain('json');
  });
});
