import type { ReactNode } from 'react';

import { AuthShell } from '@/components/shell/auth-shell';

interface AuthLayoutProps {
  children: ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps) => {
  return <AuthShell>{children}</AuthShell>;
};

export default AuthLayout;
