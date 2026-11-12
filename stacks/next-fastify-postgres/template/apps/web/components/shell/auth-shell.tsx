import type { ReactNode } from 'react';

import { APP_NAME } from '@/lib/app-constants';

import { ShellMark } from './shell-parts';

export interface AuthShellProps {
  children: ReactNode;
}

/** Signed-out pages (login, signup, not-found, errors): the product mark above one centred 360 px column on white. */
export const AuthShell = ({ children }: AuthShellProps) => (
  <div className="flex min-h-svh flex-col bg-background">
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-16">
      <p className="flex flex-col items-center">
        <ShellMark productName={APP_NAME} size="lg" />
        <span className="sr-only">{APP_NAME}</span>
      </p>
      <div className="w-full max-w-[360px]">{children}</div>
    </main>
  </div>
);
