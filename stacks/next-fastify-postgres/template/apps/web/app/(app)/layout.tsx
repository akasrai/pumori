import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { AppShell } from '@/components/shell/app-shell';
import { ROUTE } from '@/lib/app-constants';
import { getCurrentUser } from '@/lib/server-api';

interface AppLayoutProps {
  children: ReactNode;
}

/** Every signed-in page renders inside the product's shell (`APP_SHELL`: sidebar or top bar), reading `SHELL_NAV`. */
const AppLayout = async ({ children }: AppLayoutProps) => {
  const user = await getCurrentUser();

  if (!user) redirect(ROUTE.LOGIN);

  return <AppShell user={{ email: user.email }}>{children}</AppShell>;
};

export default AppLayout;
