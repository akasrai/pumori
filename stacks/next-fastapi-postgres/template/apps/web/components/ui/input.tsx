import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/** shadcn/ui Input: 36 px high (44 px below md), white, hairline border, no shadow; the border turns near-black on focus, red when aria-invalid. */
export const Input = ({ className, type, ...props }: ComponentProps<'input'>) => (
  <input
    type={type}
    data-slot="input"
    className={cn(
      'flex h-control w-full min-w-0 rounded-md border border-input bg-input-background px-3 py-2 text-base text-foreground transition-colors duration-150 outline-none max-md:h-touch md:text-sm',
      'placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground',
      'file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
      'hover:border-border-strong focus-visible:border-foreground',
      'aria-invalid:border-destructive',
      'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
);
