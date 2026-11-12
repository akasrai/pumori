import type { FastifyPluginAsync } from 'fastify';
import type { DevMailListResponse } from '@app/shared';
import { isDevMailer } from '../lib/mailer.ts';
import { currentUser, requireUser } from '../lib/session.ts';

/**
 * Dev-only outbox (registered through registerDevOnly, so it does not exist in production).
 * Login-only and recipient-only: a user sees just the mail sent to their own address.
 */
export const devMailRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireUser);

  app.get('/mail', async (request): Promise<DevMailListResponse> => {
    const user = currentUser(request);
    const outbox = isDevMailer(app.mailer) ? app.mailer.outboxFor(user.email) : [];

    return { mail: outbox.map((mail) => ({ ...mail, sentAt: mail.sentAt.toISOString() })) };
  });
};
