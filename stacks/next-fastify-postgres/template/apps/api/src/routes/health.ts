import type { FastifyPluginAsync, RouteHandlerMethod } from 'fastify';
import { sql } from 'drizzle-orm';

const NO_RATE_LIMIT = { rateLimit: false } as const;

export const healthRoutes: FastifyPluginAsync = async (app) => {
  // Liveness: the process is up and serving. Never touches dependencies, so a database outage
  // does not make the orchestrator restart healthy API processes.
  app.get('/livez', { config: NO_RATE_LIMIT }, async () => {
    return { status: 'ok' };
  });

  // Readiness: can serve traffic (database reachable). /health is kept as an alias.
  const readiness: RouteHandlerMethod = async (_request, reply) => {
    try {
      await app.db.execute(sql`select 1`);

      return { status: 'ok' };
    } catch (err) {
      app.log.warn({ err }, 'readiness check failed');
      reply.status(503);

      return { status: 'unavailable' };
    }
  };
  app.get('/readyz', { config: NO_RATE_LIMIT }, readiness);
  app.get('/health', { config: NO_RATE_LIMIT }, readiness);
};
