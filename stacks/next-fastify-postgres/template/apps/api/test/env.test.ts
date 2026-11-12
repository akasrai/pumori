import { describe, expect, it } from 'vitest';
import { loadEnv } from '../src/env.ts';

const base = {
  DATABASE_URL: 'postgres://u@localhost:5432/db',
  API_PORT: '4000',
  SESSION_SECRET: 'a-long-enough-session-secret',
  WEB_ORIGIN: 'https://app.example.com',
};

describe('env', () => {
  it('requires an https WEB_ORIGIN in production', () => {
    const { WEB_ORIGIN: _omit, ...noOrigin } = base;

    expect(() => loadEnv({ ...noOrigin, NODE_ENV: 'production', COOKIE_SECURE: 'true' })).toThrow(/WEB_ORIGIN/);
    expect(() => loadEnv({ ...base, NODE_ENV: 'production', COOKIE_SECURE: 'true', WEB_ORIGIN: 'http://app.example.com' }))
      .toThrow(/WEB_ORIGIN/);
  });

  it('defaults WEB_ORIGIN to the local web port outside production, without a trailing slash', () => {
    const { WEB_ORIGIN: _omit, ...noOrigin } = base;

    expect(loadEnv({ ...noOrigin, WEB_PORT: '3123' }).WEB_ORIGIN).toBe('http://localhost:3123');
    expect(loadEnv({ ...base, WEB_ORIGIN: 'https://app.example.com/' }).WEB_ORIGIN).toBe('https://app.example.com');
  });

  it('refuses production with insecure cookies', () => {
    expect(() => loadEnv({ ...base, NODE_ENV: 'production', COOKIE_SECURE: 'false' })).toThrow(/COOKIE_SECURE/);
  });

  it('allows insecure cookies in production only with ALLOW_INSECURE_COOKIES=true', () => {
    const env = loadEnv({ ...base, NODE_ENV: 'production', COOKIE_SECURE: 'false', ALLOW_INSECURE_COOKIES: 'true' });

    expect(env.COOKIE_SECURE).toBe(false);
  });

  it('defaults to production-safe values', () => {
    const env = loadEnv({ ...base, NODE_ENV: 'production', COOKIE_SECURE: 'true' });

    expect(env).toMatchObject({ TRUST_PROXY: false, MAIL_TRANSPORT: 'log', DB_POOL_MAX: 10 });
  });

  it('parses TRUST_PROXY as a hop count or a list of IPs/CIDRs', () => {
    expect(loadEnv({ ...base, TRUST_PROXY: '1' }).TRUST_PROXY).toBe(1);
    expect(loadEnv({ ...base, TRUST_PROXY: '10.0.0.0/8, 127.0.0.1' }).TRUST_PROXY).toEqual(['10.0.0.0/8', '127.0.0.1']);
    expect(() => loadEnv({ ...base, TRUST_PROXY: 'true' })).toThrow(/TRUST_PROXY/);
    expect(() => loadEnv({ ...base, TRUST_PROXY: '10.0.0.0/33' })).toThrow(/TRUST_PROXY/);
  });

  it('never allows the dev mail transport in production', () => {
    const prodDevMail = { ...base, NODE_ENV: 'production', COOKIE_SECURE: 'true', MAIL_TRANSPORT: 'dev' };

    expect(() => loadEnv(prodDevMail)).toThrow(/MAIL_TRANSPORT/);
  });
});
