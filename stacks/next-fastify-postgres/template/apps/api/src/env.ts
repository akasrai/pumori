import { isIP } from 'node:net';
import { z } from 'zod';

const booleanString = (fallback: 'true' | 'false') => {
  return z.enum(['true', 'false']).default(fallback).transform((v) => v === 'true');
};

const isIpOrCidr = (value: string): boolean => {
  const [address, prefix, ...rest] = value.split('/');

  if (!address || rest.length > 0 || isIP(address) === 0) return false;

  if (prefix === undefined) return true;
  const bits = Number(prefix);
  const maxBits = isIP(address) === 4 ? 32 : 128;

  return /^\d+$/.test(prefix) && bits >= 0 && bits <= maxBits;
};

/**
 * TRUST_PROXY: `false` (default: use the socket address), a hop count (`1` = the web server's
 * /api rewrite or one load balancer in front of the API), or a comma-separated list of trusted
 * proxy IPs/CIDRs. `true` (trust everything) is refused: any client could then spoof its IP
 * through X-Forwarded-For and dodge rate limits.
 */
const trustProxySchema = z
  .string()
  .trim()
  .default('false')
  .transform((value, ctx): false | number | string[] => {
    if (value === 'false' || value === '') return false;

    if (/^\d+$/.test(value)) return Number(value);
    const entries = value.split(',').map((entry) => entry.trim()).filter(Boolean);

    if (entries.length > 0 && entries.every(isIpOrCidr)) return entries;
    ctx.addIssue({ code: 'custom', message: 'must be false, a hop count (e.g. 1) or a comma-separated list of IPs/CIDRs' });

    return z.NEVER;
  });

const DEFAULT_WEB_PORT = 3000;

const positiveInt = (fallback: number) => z.coerce.number().int().positive().default(fallback);

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//, 'must be a postgres:// URL'),
    API_PORT: z.coerce.number().int().min(0).max(65535),
    HOST: z.string().min(1).default('localhost'),
    SESSION_SECRET: z.string().min(16, 'must be at least 16 characters (run ./init.sh to generate one)'),
    COOKIE_SECURE: booleanString('false'),
    /** Escape hatch for production images served over plain http (local Docker staging only). */
    ALLOW_INSECURE_COOKIES: booleanString('false'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    TRUST_PROXY: trustProxySchema,
    /** Postgres connections per API process. */
    DB_POOL_MAX: positiveInt(10),
    /** Server-side cap for one SQL statement. */
    DB_STATEMENT_TIMEOUT_MS: positiveInt(10_000),
    /** Requests per IP per minute, across all routes. */
    RATE_LIMIT_MAX: positiveInt(300),
    /** Login attempts and signups per IP per 15 minutes (each). */
    RATE_LIMIT_AUTH_MAX: positiveInt(20),
    /** Login attempts per email address per 15 minutes. */
    RATE_LIMIT_LOGIN_EMAIL_MAX: positiveInt(10),
    /** `dev` keeps mail in memory for the dev-only outbox; `log` drops it (production placeholder). */
    MAIL_TRANSPORT: z.enum(['dev', 'log']).optional(),
    /**
     * Public URL of the web app (no trailing slash), for links the API writes into emails and responses
     * (invites, password resets). Defaults to http://localhost:$WEB_PORT outside production.
     */
    WEB_ORIGIN: z.url({ protocol: /^https?$/ }).optional(),
    WEB_PORT: z.coerce.number().int().min(1).max(65535).optional(),
  })
  .refine((env) => env.NODE_ENV !== 'production' || env.SESSION_SECRET !== 'change-me', {
    message: 'SESSION_SECRET must be changed in production',
    path: ['SESSION_SECRET'],
  })
  .refine((env) => env.NODE_ENV !== 'production' || env.COOKIE_SECURE || env.ALLOW_INSECURE_COOKIES, {
    message: 'must be true in production (set ALLOW_INSECURE_COOKIES=true only for local http staging)',
    path: ['COOKIE_SECURE'],
  })
  .refine((env) => env.NODE_ENV !== 'production' || env.WEB_ORIGIN !== undefined, {
    message: 'required in production: the public https URL of the web app (links in emails use it)',
    path: ['WEB_ORIGIN'],
  })
  .refine(
    (env) => env.NODE_ENV !== 'production' || env.ALLOW_INSECURE_COOKIES || env.WEB_ORIGIN?.startsWith('https://') !== false,
    { message: 'must be https in production', path: ['WEB_ORIGIN'] },
  )
  .refine((env) => env.NODE_ENV !== 'production' || env.MAIL_TRANSPORT !== 'dev', {
    message: 'the dev mail transport is never available in production',
    path: ['MAIL_TRANSPORT'],
  })
  .transform((env) => ({
    ...env,
    MAIL_TRANSPORT: env.MAIL_TRANSPORT ?? (env.NODE_ENV === 'production' ? 'log' : 'dev'),
    WEB_ORIGIN: (env.WEB_ORIGIN ?? `http://localhost:${env.WEB_PORT ?? DEFAULT_WEB_PORT}`).replace(/\/+$/, ''),
  }));

export type Env = z.output<typeof envSchema>;

const formatIssues = (error: z.ZodError): string => {
  return error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
};

/** Parses and validates configuration. Server-only: never expose these values to the web app. */
export const loadEnv = (source: NodeJS.ProcessEnv = process.env): Env => {
  const result = envSchema.safeParse(source);

  if (!result.success) throw new Error(`Invalid environment:\n${formatIssues(result.error)}`);

  return result.data;
};

const migrateEnvSchema = z.object({
  DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//, 'must be a postgres:// URL'),
});

/** The subset the deploy-time migrator needs (no session secret, no ports). */
export const loadMigrateEnv = (source: NodeJS.ProcessEnv = process.env): z.output<typeof migrateEnvSchema> => {
  const result = migrateEnvSchema.safeParse(source);

  if (!result.success) throw new Error(`Invalid environment:\n${formatIssues(result.error)}`);

  return result.data;
};
