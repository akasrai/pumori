import { z } from 'zod';

/** A message from the dev-only mail outbox (GET /dev/mail). Never available in production. */
export const devMailSchema = z.object({
  to: z.email(),
  subject: z.string(),
  text: z.string(),
  sentAt: z.iso.datetime({ offset: true }),
});
export type DevMail = z.infer<typeof devMailSchema>;

export const devMailListResponseSchema = z.object({ mail: z.array(devMailSchema) });
export type DevMailListResponse = z.infer<typeof devMailListResponseSchema>;
