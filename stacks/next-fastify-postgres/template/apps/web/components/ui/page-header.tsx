import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface PageHeaderProps {
  /** The page's single `<h1>`. */
  title: ReactNode;
  /** Only for page headers shown inside another page (the UI gallery). */
  titleAs?: 'h1' | 'h2';
  description?: ReactNode;
  /** `<Breadcrumb>` above the title on detail pages. */
  breadcrumb?: ReactNode;
  /** Page actions, primary last (rightmost): `<Button variant="outline">Export</Button><Button>New project</Button>`. */
  actions?: ReactNode;
  /** `<TabsList>` or other secondary navigation under the title. */
  children?: ReactNode;
  className?: string;
}

/** Title row of every page: breadcrumb, h1 + description on the left, actions on the right (stacked on mobile). */
export const PageHeader = ({ title, titleAs: Title = 'h1', description, breadcrumb, actions, children, className }: PageHeaderProps) => (
  <header data-slot="page-header" className={cn('grid gap-4 pb-8', className)}>
    {breadcrumb}
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="grid min-w-0 gap-1">
        <Title className="text-2xl font-semibold tracking-tight text-foreground">{title}</Title>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
    {children}
  </header>
);
