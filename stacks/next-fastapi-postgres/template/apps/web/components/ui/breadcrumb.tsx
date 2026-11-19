import { ChevronRightIcon, MoreHorizontalIcon } from 'lucide-react';
import { Slot } from 'radix-ui';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

export const Breadcrumb = (props: ComponentProps<'nav'>) => <nav aria-label="Breadcrumb" data-slot="breadcrumb" {...props} />;

export const BreadcrumbList = ({ className, ...props }: ComponentProps<'ol'>) => (
  <ol data-slot="breadcrumb-list" className={cn('flex flex-wrap items-center gap-2 text-sm break-words text-muted-foreground', className)} {...props} />
);

export const BreadcrumbItem = ({ className, ...props }: ComponentProps<'li'>) => (
  <li data-slot="breadcrumb-item" className={cn('inline-flex items-center gap-2', className)} {...props} />
);

export interface BreadcrumbLinkProps extends ComponentProps<'a'> {
  /** Pass a Next `<Link>` as the child. */
  asChild?: boolean;
}

export const BreadcrumbLink = ({ asChild, className, ...props }: BreadcrumbLinkProps) => {
  const Comp = asChild ? Slot.Root : 'a';

  return <Comp data-slot="breadcrumb-link" className={cn('transition-colors hover:text-foreground', className)} {...props} />;
};

export const BreadcrumbPage = ({ className, ...props }: ComponentProps<'span'>) => (
  <span data-slot="breadcrumb-page" aria-current="page" className={cn('font-medium text-foreground', className)} {...props} />
);

export const BreadcrumbSeparator = ({ children, className, ...props }: ComponentProps<'li'>) => (
  <li data-slot="breadcrumb-separator" role="presentation" aria-hidden="true" className={cn('[&>svg]:size-3.5', className)} {...props}>
    {children ?? <ChevronRightIcon />}
  </li>
);

export const BreadcrumbEllipsis = ({ className, ...props }: ComponentProps<'span'>) => (
  <span data-slot="breadcrumb-ellipsis" role="presentation" aria-hidden="true" className={cn('flex size-9 items-center justify-center', className)} {...props}>
    <MoreHorizontalIcon className="size-4" />
    <span className="sr-only">More</span>
  </span>
);
