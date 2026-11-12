'use client';

import { APP_SHELL, type ShellKind } from '@/lib/app-constants';

import type { ShellLayoutProps } from './shell-layout-types';
import { SidebarShell } from './sidebar-shell';
import { TopbarShell } from './topbar-shell';

export interface AppShellProps extends ShellLayoutProps {
  /** Which shell to render. Defaults to the product's `APP_SHELL` (lib/app-constants.ts); set it there, not here. */
  shell?: ShellKind;
}

/**
 * The signed-in layout: renders the product's chosen shell (`APP_SHELL`: `'sidebar'` or `'topbar'`).
 * Both shells read the same `SHELL_NAV`, so switching needs no other change. The `shell` prop exists
 * for the UI gallery's previews.
 */
export const AppShell = ({ shell = APP_SHELL, ...props }: AppShellProps) => {
  if (shell === 'topbar') return <TopbarShell {...props} />;

  return <SidebarShell {...props} />;
};
