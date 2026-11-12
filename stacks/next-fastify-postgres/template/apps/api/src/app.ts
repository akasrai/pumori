import Fastify, { type FastifyError, type FastifyInstance, type FastifyServerOptions } from 'fastify';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import { ErrorCode, type ApiError, type User } from '@app/shared';
import { createDb, type Db } from './db/client.ts';
import { loadEnv, type Env } from './env.ts';
import { registerDevOnly } from './lib/dev-only.ts';
import { AppError } from './lib/errors.ts';
import { buildLoggerOptions, redactUrl } from './lib/logger.ts';
import { createMailer, type Mailer } from './lib/mailer.ts';
import { registerRateLimit } from './lib/rate-limit.ts';
import { reportError } from './lib/report-error.ts';
import { purgeExpiredSessions } from './lib/session.ts';
import { authRoutes } from './routes/auth.ts';
import { devMailRoutes } from './routes/dev-mail.ts';
import { healthRoutes } from './routes/health.ts';

declare module 'fastify' {
  interface FastifyInstance {
    db: Db;
    env: Env;
    mailer: Mailer;
  }
  interface FastifyRequest {
    /** Set by the requireUser preHandler. Read it via currentUser(request). */
    user: User | null;
  }
}

export interface BuildAppOptions {
  env?: Env;
  logger?: boolean | FastifyServerOptions['logger'];
}

/** Largest accepted request body. JSON APIs rarely need more; uploads should go straight to storage. */
const BODY_LIMIT_BYTES = 256 * 1024;
/** Whole-request deadline (headers + body + handler); protects against slow clients. */
const REQUEST_TIMEOUT_MS = 30_000;

/** Framework (non-AppError) 4xx errors: status → stable error code and a message that echoes nothing. */
const FRAMEWORK_ERRORS: Record<number, { code: ErrorCode; message: string }> = {
  401: { code: ErrorCode.Unauthenticated, message: 'Authentication required' },
  403: { code: ErrorCode.Forbidden, message: 'Forbidden' },
  404: { code: ErrorCode.NotFound, message: 'Not found' },
  405: { code: ErrorCode.MethodNotAllowed, message: 'Method not allowed' },
  408: { code: ErrorCode.RequestTimeout, message: 'Request timed out' },
  413: { code: ErrorCode.PayloadTooLarge, message: 'Request body is too large' },
  415: { code: ErrorCode.UnsupportedMediaType, message: 'Unsupported content type' },
  429: { code: ErrorCode.RateLimited, message: 'Too many requests' },
};

const toTrustProxy = (value: Env['TRUST_PROXY']): boolean | string[] | ((address: string, hop: number) => boolean) => {
  if (typeof value === 'number') return (_address, hop) => hop < value;

  return value;
};

const frameworkError = (status: number, err: FastifyError): ApiError => {
  const known = FRAMEWORK_ERRORS[status];

  if (known) return { error: known };

  // 400s (malformed JSON, empty body with a JSON content type, ...) keep Fastify's explanation.
  return { error: { code: ErrorCode.BadRequest, message: err.message } };
};

/** Builds the Fastify app without listening. Tests use `app.inject()`; server.ts calls listen(). */
export const buildApp = async (options: BuildAppOptions = {}): Promise<FastifyInstance> => {
  const env = options.env ?? loadEnv();
  const logger = options.logger === undefined || options.logger === true ? buildLoggerOptions(env.LOG_LEVEL) : options.logger;
  const app = Fastify({
    logger,
    trustProxy: toTrustProxy(env.TRUST_PROXY),
    bodyLimit: BODY_LIMIT_BYTES,
    requestTimeout: REQUEST_TIMEOUT_MS,
  });

  const { db, close } = createDb(env.DATABASE_URL, {
    poolMax: env.DB_POOL_MAX,
    statementTimeoutMs: env.DB_STATEMENT_TIMEOUT_MS,
  });
  app.decorate('db', db);
  app.decorate('env', env);
  app.decorate('mailer', createMailer(env, app.log));
  app.decorateRequest('user', null);
  app.addHook('onClose', close);
  app.addHook('onReady', async () => {
    try {
      const removed = await purgeExpiredSessions(db);
      app.log.info({ removed }, 'expired sessions purged');
    } catch (err) {
      // Startup must not depend on housekeeping; the next login retries it.
      app.log.warn({ err }, 'session purge failed');
    }
  });

  // JSON API: nothing it returns should ever run, load resources or be framed in a browser.
  // HSTS only in production: it is meaningless over http and sticky in browsers.
  await app.register(helmet, {
    contentSecurityPolicy: { useDefaults: false, directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
    frameguard: { action: 'deny' },
    hsts: env.NODE_ENV === 'production',
  });
  await app.register(cookie, { secret: env.SESSION_SECRET });
  // Must be registered before the routes it limits.
  await registerRateLimit(app);

  app.setErrorHandler((err: FastifyError | AppError, request, reply) => {
    let status = 500;
    let body: ApiError;

    if (err instanceof AppError) {
      status = err.statusCode;
      body = { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } };
    } else if (typeof err.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 500) {
      // Framework errors: malformed JSON, unsupported media type, body too large, ...
      status = err.statusCode;
      body = frameworkError(status, err);
    } else {
      request.log.error({ err }, 'unhandled error');
      reportError(err, { method: request.method, url: redactUrl(request.url), requestId: String(request.id) });
      body = { error: { code: ErrorCode.Internal, message: 'Internal server error' } };
    }

    if (status >= 500 && err instanceof AppError) {
      reportError(err, { method: request.method, url: redactUrl(request.url), requestId: String(request.id) });
    }

    return reply.status(status).send(body);
  });

  app.setNotFoundHandler((_request, reply) => {
    // Never echo the URL: it can carry tokens and it reflects attacker input.
    const body: ApiError = { error: { code: ErrorCode.NotFound, message: 'Route not found' } };

    return reply.status(404).send(body);
  });

  await app.register(healthRoutes);
  await app.register(authRoutes);
  await registerDevOnly(app, devMailRoutes);

  return app;
};
