import type { FastifyServerOptions } from 'fastify';
import type { Env } from '../env.ts';

export const REDACTED = '[redacted]';

/** Path segments at least this long that look like tokens are redacted from logged URLs. */
const TOKEN_MIN_LENGTH = 20;
const TOKEN_CHARS = /^[A-Za-z0-9._~%+=-]+$/;
// Record ids stay readable so logs remain useful. Never use a UUID as a secret token
// (invites, password resets): use randomBytes(32).toString('base64url').
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Headers that carry credentials; pino replaces them wherever they appear in a log line. */
export const REDACT_PATHS = [
  'req.headers.cookie',
  'req.headers.authorization',
  'headers.cookie',
  'headers.authorization',
  'res.headers["set-cookie"]',
];

const isTokenLike = (segment: string): boolean => {
  return segment.length >= TOKEN_MIN_LENGTH && TOKEN_CHARS.test(segment) && !UUID.test(segment);
};

/**
 * Removes secrets from a request URL before it is logged: long token-like path segments become
 * `[redacted]` and the whole query string is dropped (`/invites/abc…?x=1` → `/invites/[redacted]?[redacted]`).
 */
export const redactUrl = (url: string): string => {
  const queryStart = url.indexOf('?');
  const pathname = queryStart === -1 ? url : url.slice(0, queryStart);
  const redactedPath = pathname
    .split('/')
    .map((segment) => (isTokenLike(segment) ? REDACTED : segment))
    .join('/');

  return queryStart === -1 ? redactedPath : `${redactedPath}?${REDACTED}`;
};

export interface LoggableRequest {
  method?: string;
  url?: string;
  host?: string;
  ip?: string;
  socket?: { remotePort?: number };
}

/** pino `req` serializer: Fastify's default fields, with the URL redacted and no headers. */
export const serializeRequest = (req: LoggableRequest) => {
  return {
    method: req.method,
    url: req.url === undefined ? undefined : redactUrl(req.url),
    host: req.host,
    remoteAddress: req.ip,
    remotePort: req.socket?.remotePort,
  };
};

export type LoggerOptions = Exclude<FastifyServerOptions['logger'], boolean | undefined>;

/** Fastify `logger` options shared by the server and tests. */
export const buildLoggerOptions = (level: Env['LOG_LEVEL']): LoggerOptions => {
  return {
    level,
    serializers: { req: serializeRequest },
    redact: { paths: REDACT_PATHS, censor: REDACTED },
  };
};
