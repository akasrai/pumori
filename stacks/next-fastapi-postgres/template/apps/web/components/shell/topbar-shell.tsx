'use client';

import { APP_NAME } from '@/lib/app-constants';

import type { ShellLayoutProps } from './shell-layout-types';
import { ShellTabs } from './shell-nav';
import { SHELL_NAV } from './shell-nav-items';
import { ShellBrand, ShellSkipLink } from './shell-parts';
import { UserMenu } from './user-menu';

/**
 * Vercel-style top-bar shell: a white sticky header (mark + product name, optional context switcher
 * after a slash, a small avatar on the right) over a row of underline tabs whose active bar sits on the
 * header's bottom hairline; content in a centred max-width column. Below `md` the tabs scroll sideways
 * inside the header (never the page). For ≤5 main sections and project- or entity-centric products
 * (docs/design.md § Choosing a shell).
 */
export const TopbarShell = ({ user, children, nav = SHELL_NAV, productName = APP_NAME, contextSwitcher }: ShellLayoutProps) => (
  <div data-shell="topbar" className="flex min-h-svh flex-col bg-background">
    <ShellSkipLink />

    <header data-slot="shell-header" className="sticky top-0 z-40 border-b bg-background">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 md:px-8">
        <ShellBrand productName={productName} hideNameOnMobile={Boolean(contextSwitcher)} />
        {contextSwitcher ? (
          <>
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0 text-border-strong" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M16.88 3.549L7.12 20.451" />
            </svg>
            <div className="-ml-1 min-w-0">{contextSwitcher}</div>
          </>
        ) : null}
        <div className="ml-auto flex items-center">
          <UserMenu user={user} variant="compact" />
        </div>
      </div>
      <ShellTabs sections={nav} className="mx-auto w-full max-w-6xl px-2 md:px-6" />
    </header>

    <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 outline-none md:px-8 md:py-10">
      {children}
    </main>
  </div>
);
