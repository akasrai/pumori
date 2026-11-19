'use client';

import { MenuIcon } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { APP_NAME } from '@/lib/app-constants';

import type { ShellLayoutProps } from './shell-layout-types';
import { ShellNav } from './shell-nav';
import { SHELL_NAV } from './shell-nav-items';
import { ShellBrand, ShellSkipLink } from './shell-parts';
import { UserMenu } from './user-menu';

/**
 * Sidebar shell: a white 220 px left sidebar separated by one hairline (brand, optional context
 * switcher, grouped nav, a quiet account row at the bottom) and the content in a centred max-width
 * column. Below `md` the sidebar becomes a top bar whose menu button opens it in a sheet.
 * For many sections, nested groups and admin-heavy back offices (docs/design.md § Choosing a shell).
 */
export const SidebarShell = ({ user, children, nav = SHELL_NAV, productName = APP_NAME, contextSwitcher }: ShellLayoutProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div data-shell="sidebar" className="flex min-h-svh bg-background">
      <ShellSkipLink />

      <aside className="sticky top-0 hidden h-svh w-[220px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex h-14 items-center px-5">
          <ShellBrand productName={productName} />
        </div>
        {contextSwitcher ? <div className="px-3 pb-2">{contextSwitcher}</div> : null}
        <div className="flex-1 overflow-y-auto py-2">
          <ShellNav sections={nav} />
        </div>
        <div className="p-3">
          <UserMenu user={user} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header data-slot="shell-header" className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-background px-2 md:hidden">
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open navigation">
                <MenuIcon />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-sidebar p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SheetDescription className="sr-only">Main navigation</SheetDescription>
              <div className="flex h-14 items-center px-5">
                <ShellBrand productName={productName} />
              </div>
              {contextSwitcher ? <div className="px-3 pb-2">{contextSwitcher}</div> : null}
              <div className="py-2">
                <ShellNav sections={nav} onNavigate={() => setIsMenuOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
          <div className="min-w-0 flex-1">
            <ShellBrand productName={productName} />
          </div>
          <UserMenu user={user} variant="compact" />
        </header>

        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 outline-none md:px-8 md:py-10">
          {children}
        </main>
      </div>
    </div>
  );
};
