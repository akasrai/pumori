import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { ROUTE } from '@/lib/app-constants';
import { formatDateTime } from '@/lib/format-utils';
import { getCurrentUser, getDevMail } from '@/lib/server-api';

export const metadata: Metadata = { title: 'Dev mail outbox' };
export const dynamic = 'force-dynamic';

/**
 * Dev-only outbox: the mail the API "sent" to the signed-in user (MAIL_TRANSPORT=dev).
 * In production the API has no /dev routes, so this page is a 404.
 */
const DevMailPage = async () => {
  if (process.env.NODE_ENV === 'production') notFound();
  const user = await getCurrentUser();

  if (!user) redirect(ROUTE.LOGIN);
  const mail = await getDevMail();

  if (!mail) notFound();

  return (
    <>
      <PageHeader
        title="Dev mail outbox"
        description={`Mail sent to ${user.email} by this API process.`}
        actions={<Badge variant="warning">Development only</Badge>}
      />
      {mail.length === 0 ? (
        <EmptyState title="No mail yet" description="Mail the API sends you (sign-up, password reset, invites) shows up here." />
      ) : (
        <ul className="grid gap-4">
          {mail.map((item) => (
            <li key={`${item.sentAt}-${item.subject}`}>
              <Card className="gap-4">
                <CardHeader>
                  <CardTitle>{item.subject}</CardTitle>
                  <CardDescription>{formatDateTime(item.sentAt)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="overflow-x-auto rounded-md border p-4 font-mono text-caption whitespace-pre-wrap">{item.text}</pre>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
};

export default DevMailPage;
