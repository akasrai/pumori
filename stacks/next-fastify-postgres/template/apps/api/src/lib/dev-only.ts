import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import type { Env } from '../env.ts';

/** Prefix for every dev-only route. */
export const DEV_PREFIX = '/dev';

/** Dev stand-ins (mail outbox, fake payment provider, ...) exist outside production only. */
export const devOnlyEnabled = (env: Pick<Env, 'NODE_ENV'>): boolean => {
  return env.NODE_ENV !== 'production';
};

/**
 * Registers a plugin under /dev only when NODE_ENV !== 'production'. In production the routes do
 * not exist at all (404), so nothing depends on a runtime flag. Dev routes must still require a
 * session and only show the signed-in user's own data (see docs/conventions.md).
 */
export const registerDevOnly = async (app: FastifyInstance, plugin: FastifyPluginAsync): Promise<void> => {
  if (!devOnlyEnabled(app.env)) return;

  await app.register(plugin, { prefix: DEV_PREFIX });
};
