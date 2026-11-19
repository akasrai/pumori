'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

import type { ShellNavSection } from './shell-nav-items';

const isActive = (pathname: string, href: string): boolean => {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
};

export interface ShellNavProps {
  sections: ShellNavSection[];
  /** Called after a link is chosen (closes the mobile sheet). */
  onNavigate?: () => void;
}

/** Sidebar navigation: compact 32 px rows, muted labels; the current page in foreground on a #f5f5f5 fill. */
export const ShellNav = ({ sections, onNavigate }: ShellNavProps) => {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="grid gap-5 px-3">
      {sections.map((section, index) => (
        <div key={section.label ?? index} className="grid gap-1">
          {section.label ? (
            <p className="px-2 pb-1 text-xs text-sidebar-muted-foreground">{section.label}</p>
          ) : null}
          <ul className="grid gap-0.5">
            {section.items.map((item) => {
              const active = isActive(pathname, item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'focus-ring flex h-8 items-center gap-2 rounded-md px-2 text-sm font-medium transition-colors duration-150 max-md:h-touch',
                      active
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    )}
                  >
                    <Icon icon={item.icon} className={active ? 'text-sidebar-accent-foreground' : 'text-sidebar-muted-foreground'} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
};

export interface ShellTabsProps {
  sections: ShellNavSection[];
  className?: string;
}

/**
 * Top-bar navigation: every `SHELL_NAV` item (sections flattened) as an underline tab, Vercel style:
 * 14 px muted labels with a soft hover fill, the current one in foreground with a 2 px bar sitting on
 * the header's bottom hairline. Scrolls sideways inside itself on narrow screens.
 */
export const ShellTabs = ({ sections, className }: ShellTabsProps) => {
  const pathname = usePathname();
  const items = sections.flatMap((section) => section.items);

  return (
    <nav aria-label="Main" className={cn('overflow-x-auto [scrollbar-width:none]', className)}>
      <ul className="flex w-max min-w-full items-center">
        {items.map((item) => {
          const active = isActive(pathname, item.href);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'focus-ring-inset group relative flex h-11 items-center rounded-sm px-1 text-sm whitespace-nowrap max-md:h-touch',
                  'after:absolute after:inset-x-2 after:bottom-0 after:h-0.5',
                  active ? 'text-foreground after:bg-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span className="rounded-md px-2 py-1 transition-colors duration-150 group-hover:bg-accent">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
