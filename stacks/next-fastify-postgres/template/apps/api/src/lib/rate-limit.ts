import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { ErrorCode } from '@app/shared';
import { AppError } from './errors.ts';

const MINUTE_MS = 60 * 1000;
/** Window for the global per-IP limit. */
export const GLOBAL_WINDOW_MS = MINUTE_MS;
/** Window for the stricter login/signup limits. */
export const AUTH_WINDOW_MS = 15 * MINUTE_MS;

const tooManyRequests = (retryAfterSeconds: number) => {
  return new AppError(429, ErrorCode.RateLimited, `Too many requests. Try again in ${retryAfterSeconds} seconds.`);
};

/**
 * Global per-IP limit on every route (health checks opt out with `config: { rateLimit: false }`).
 * The store is in memory, i.e. per API process: with several instances, pass a shared store
 * (`redis` option) so limits hold across them. Client IPs come from `request.ip`, so set
 * TRUST_PROXY correctly when the API sits behind the web rewrite or a load balancer.
 */
export const registerRateLimit = async (app: FastifyInstance): Promise<void> => {
  await app.register(rateLimit, {
    global: true,
    max: app.env.RATE_LIMIT_MAX,
    timeWindow: GLOBAL_WINDOW_MS,
    errorResponseBuilder: (_request, context) => tooManyRequests(Math.ceil(context.ttl / 1000)),
  });
};

/** Route config for login/signup: a stricter per-IP limit (replaces the global one on that route). */
export const authIpRateLimit = (app: FastifyInstance) => ({
  rateLimit: { max: app.env.RATE_LIMIT_AUTH_MAX, timeWindow: AUTH_WINDOW_MS },
});

/**
 * A second limiter keyed by something other than the IP (e.g. the login email). Call the returned
 * function inside the handler after the body is validated; it throws 429 (with Retry-After) once
 * the key is over its limit. `keyOf` must return a normalised key (e.g. the lower-cased email).
 */
export const createKeyedLimiter = (
  app: FastifyInstance,
  options: { name: string; max: number; timeWindow: number; keyOf: (request: FastifyRequest) => string },
) => {
  const limiter = app.createRateLimit({
    max: options.max,
    timeWindow: options.timeWindow,
    keyGenerator: (request) => `${options.name}:${options.keyOf(request)}`,
  });

  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const result = await limiter(request);

    if (result.isAllowed || !result.isExceeded) return;
    reply.header('retry-after', result.ttlInSeconds);

    throw tooManyRequests(result.ttlInSeconds);
  };
};
