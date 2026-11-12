import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/** shadcn/ui Card: white, one hairline border, no shadow, 6 px radius, 20 px padding (16 px below md). */
export const Card = ({ className, ...props }: ComponentProps<'div'>) => (
  <div data-slot="card" className={cn('flex flex-col gap-4 rounded-lg border bg-card py-4 text-card-foreground md:py-5', className)} {...props} />
);

export const CardHeader = ({ className, ...props }: ComponentProps<'div'>) => (
  <div
    data-slot="card-header"
    className={cn('grid auto-rows-min grid-rows-[auto_auto] items-start gap-1 px-4 has-data-[slot=card-action]:grid-cols-[1fr_auto] md:px-5 [.border-b]:pb-4', className)}
    {...props}
  />
);

export interface CardTitleProps extends ComponentProps<'h2'> {
  /** Heading level: h2 under the page's h1 (default), h3 inside a section. */
  as?: 'h2' | 'h3' | 'h4';
}

export const CardTitle = ({ className, as: Heading = 'h2', ...props }: CardTitleProps) => (
  <Heading data-slot="card-title" className={cn('text-title font-semibold tracking-tight', className)} {...props} />
);

export const CardDescription = ({ className, ...props }: ComponentProps<'p'>) => (
  <p data-slot="card-description" className={cn('text-caption text-muted-foreground', className)} {...props} />
);

export const CardAction = ({ className, ...props }: ComponentProps<'div'>) => (
  <div data-slot="card-action" className={cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)} {...props} />
);

export const CardContent = ({ className, ...props }: ComponentProps<'div'>) => (
  <div data-slot="card-content" className={cn('px-4 md:px-5', className)} {...props} />
);

export const CardFooter = ({ className, ...props }: ComponentProps<'div'>) => (
  <div data-slot="card-footer" className={cn('flex items-center px-4 md:px-5 [.border-t]:pt-4', className)} {...props} />
);
