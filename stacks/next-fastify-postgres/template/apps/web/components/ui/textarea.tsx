import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

export const Textarea = ({ className, ...props }: ComponentProps<'textarea'>) => (
  <textarea
    data-slot="textarea"
    className={cn(
      'flex field-sizing-content min-h-20 w-full rounded-md border border-input bg-input-background px-3 py-2 text-base text-foreground transition-colors duration-150 outline-none md:text-sm',
      'placeholder:text-muted-foreground hover:border-border-strong focus-visible:border-foreground',
      'aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
);
