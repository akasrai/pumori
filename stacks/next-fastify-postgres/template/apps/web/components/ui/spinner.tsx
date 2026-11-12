import { Loader2Icon } from 'lucide-react';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/** Inline loading indicator (buttons, small areas). Whole sections load with `Skeleton` instead. */
export const Spinner = ({ className, ...props }: ComponentProps<'svg'>) => (
  <Loader2Icon role="status" aria-label="Loading" className={cn('size-4 animate-spin', className)} {...props} />
);
