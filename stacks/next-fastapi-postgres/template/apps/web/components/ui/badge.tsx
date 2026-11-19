import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/** Small 20 px pill, 12 px text, hairline border and a pale tint. Status variants pair a dot with a word (`dot`), never colour alone. */
export const badgeVariants = cva(
  'inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border px-2 text-xs font-medium whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3',
  {
    variants: {
      variant: {
        default: 'border-border bg-muted text-foreground',
        primary: 'border-transparent bg-primary text-primary-foreground',
        success: 'border-success-border bg-success-subtle text-success-subtle-foreground',
        warning: 'border-warning-border bg-warning-subtle text-warning-subtle-foreground',
        destructive: 'border-destructive-border bg-destructive-subtle text-destructive-subtle-foreground',
        info: 'border-info-border bg-info-subtle text-info-subtle-foreground',
        outline: 'border-border bg-transparent text-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps extends ComponentProps<'span'>, VariantProps<typeof badgeVariants> {
  asChild?: boolean;
  /** A 6 px status dot before the word (decorative; the word carries the meaning). */
  dot?: boolean;
}

export const Badge = ({ className, variant, asChild = false, dot = false, children, ...props }: BadgeProps) => {
  const Comp = asChild ? Slot.Root : 'span';

  return (
    <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && !asChild ? <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" /> : null}
      {children}
    </Comp>
  );
};
