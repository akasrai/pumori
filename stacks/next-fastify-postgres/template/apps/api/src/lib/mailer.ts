import type { FastifyBaseLogger } from 'fastify';
import type { Env } from '../env.ts';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface SentMail extends MailMessage {
  sentAt: Date;
}

/** Every outgoing email goes through this interface (`app.mailer.send(...)`). */
export interface Mailer {
  send: (message: MailMessage) => Promise<void>;
}

export interface DevMailer extends Mailer {
  /** Mail sent to this address, newest first. */
  outboxFor: (to: string) => SentMail[];
}

/** Keep the dev outbox bounded: it lives in memory for the life of the process. */
const DEV_OUTBOX_LIMIT = 500;

/** Development stand-in: keeps mail in memory for the dev-only outbox route (/dev/mail). */
export const createDevMailer = (now: () => Date = () => new Date()): DevMailer => {
  const outbox: SentMail[] = [];

  return {
    send: async (message) => {
      outbox.unshift({ ...message, to: message.to.toLowerCase(), sentAt: now() });
      outbox.length = Math.min(outbox.length, DEV_OUTBOX_LIMIT);
    },
    outboxFor: (to) => outbox.filter((mail) => mail.to === to.toLowerCase()),
  };
};

/**
 * Production placeholder: records THAT a mail was not sent, never the recipient or the body.
 * TODO: replace with a real transport (SMTP via nodemailer, or a provider API such as Postmark,
 * SES or Resend) behind this same interface, with a timeout on every call and its secrets in env.ts.
 */
export const createLogMailer = (log: FastifyBaseLogger): Mailer => {
  return {
    send: async (message) => {
      log.warn({ subject: message.subject }, 'mail not sent: no mail transport configured');
    },
  };
};

export const createMailer = (env: Pick<Env, 'MAIL_TRANSPORT'>, log: FastifyBaseLogger): Mailer | DevMailer => {
  return env.MAIL_TRANSPORT === 'dev' ? createDevMailer() : createLogMailer(log);
};

export const isDevMailer = (mailer: Mailer): mailer is DevMailer => {
  return 'outboxFor' in mailer;
};
