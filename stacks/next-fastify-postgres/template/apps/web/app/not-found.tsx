import type { Metadata } from 'next';
import Link from 'next/link';

import { AuthShell } from '@/components/shell/auth-shell';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ROUTE } from '@/lib/app-constants';

export const metadata: Metadata = { title: 'Page not found' };

const NotFound = () => {
  return (
    <AuthShell>
      <EmptyState
        titleAs="h1"
        title="Page not found"
        description="The page you are looking for does not exist or has moved."
        action={<Button asChild><Link href={ROUTE.HOME}>Go to the home page</Link></Button>}
      />
    </AuthShell>
  );
};

export default NotFound;
