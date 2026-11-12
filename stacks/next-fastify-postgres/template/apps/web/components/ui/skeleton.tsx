import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/** Placeholder with the shape of the content that is loading: a faint grey pulse. */
export const Skeleton = ({ className, ...props }: ComponentProps<'div'>) => (
  <div data-slot="skeleton" aria-hidden="true" className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />
);
