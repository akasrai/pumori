import { redirect } from 'next/navigation';

import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { ROUTE } from '@/lib/app-constants';
import { formatDate } from '@/lib/format-utils';
import { getCurrentUser } from '@/lib/server-api';

export const dynamic = 'force-dynamic';

/** Placeholder dashboard: replace the empty state with the product's first summary (see docs/design.md § Layout patterns). */
const HomePage = async () => {
  const user = await getCurrentUser();

  if (!user) redirect(ROUTE.LOGIN);

  return (
    <>
      <PageHeader title="Overview" description="Your workspace at a glance." />
      <div className="grid gap-10">
        <EmptyState
          title="Nothing to show yet"
          description="Summaries and shortcuts appear here as features are added."
        />
        <section aria-labelledby="account-title" className="grid gap-3">
          <h2 id="account-title" className="text-sm font-semibold">Account</h2>
          <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-[10rem_1fr]">
            <dt className="text-muted-foreground">Email</dt>
            <dd data-testid="user-email" className="truncate max-sm:mb-2">{user.email}</dd>
            <dt className="text-muted-foreground">Member since</dt>
            <dd className="tabular-nums">{formatDate(user.createdAt)}</dd>
          </dl>
        </section>
      </div>
    </>
  );
};

export default HomePage;
