import { LayoutDashboardIcon, type LucideIcon } from 'lucide-react';

import { ROUTE } from '@/lib/app-constants';

export interface ShellNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface ShellNavSection {
  /** Small sentence-case group label in the sidebar ("Monitoring", never all caps); the top bar ignores it. */
  label?: string;
  items: ShellNavItem[];
}

/**
 * The product's main navigation, read by both shells: the sidebar shows the sections as groups, the
 * top bar flattens them into tabs. Add a feature's list page here; sidebar: 5–8 items in 1–3 sections;
 * top bar: ≤5 items (section labels are not shown).
 * Never add developer tools here (mail outbox, UI gallery): they are dev-only pages reached by URL
 * (`/dev/mail`, `/dev/ui`) and are not part of the product's navigation.
 */
export const SHELL_NAV: ShellNavSection[] = [
  { items: [{ label: 'Overview', href: ROUTE.HOME, icon: LayoutDashboardIcon }] },
];
