import type { ReactNode } from 'react';

import type { ShellNavSection } from './shell-nav-items';
import type { ShellUser } from './user-menu';

/** Props shared by both shells (and `AppShell`, which picks one). */
export interface ShellLayoutProps {
  user: ShellUser;
  children: ReactNode;
  /** Defaults to the product's `SHELL_NAV`. */
  nav?: ShellNavSection[];
  productName?: string;
  /**
   * Optional team/project/workspace switcher (`<ContextSwitcher />`): next to the logo in the top bar,
   * under the brand in the sidebar.
   */
  contextSwitcher?: ReactNode;
}
