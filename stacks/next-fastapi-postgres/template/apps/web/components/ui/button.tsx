import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2Icon } from 'lucide-react';
import { Slot } from 'radix-ui';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'focus-ring inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4',
  {
    variants: {
      variant: {
        // Solid near-black: the one main action per view.
        default: 'bg-primary text-primary-foreground hover:bg-primary/85',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        // White with a hairline border: every other action. `secondary` is the same look.
        outline: 'border border-input bg-background text-foreground hover:border-border-strong hover:bg-accent',
        secondary: 'border border-input bg-secondary text-secondary-foreground hover:border-border-strong hover:bg-accent',
        // Tertiary actions, toolbars, icon buttons in rows.
        ghost: 'text-foreground hover:bg-accent hover:text-accent-foreground',
        link: 'text-foreground underline-offset-4 hover:underline',
      },
      size: {
        // Compact on desktop (36/32/40 px); every size is a 44 px tap target below md.
        default: 'h-control px-4 has-[>svg]:px-3 max-md:h-touch',
        sm: 'h-control-sm px-3 has-[>svg]:px-2.5 max-md:h-touch',
        lg: 'h-control-lg px-5 has-[>svg]:px-4 max-md:h-touch',
        icon: 'size-control max-md:size-touch',
        'icon-sm': 'size-control-sm max-md:size-touch',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps extends ComponentProps<'button'>, VariantProps<typeof buttonVariants> {
  /** Render the child element (e.g. a Next `<Link>`) with button styles instead of a `<button>`. */
  asChild?: boolean;
  /** Shows a spinner, disables the button and sets aria-busy. Keep the label: it is still read out. */
  isLoading?: boolean;
}

/** shadcn/ui Button (36 px; sm 32 px; 44 px below md; 6 px radius). Variants: default (solid, the one primary action), outline/secondary (white, hairline), ghost, link, destructive. */
export const Button = ({ className, variant, size, asChild = false, isLoading = false, disabled, children, ...props }: ButtonProps) => {
  if (asChild) {
    return <Slot.Root data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props}>{children}</Slot.Root>;
  }

  return (
    <button
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled === true || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? <Loader2Icon aria-hidden="true" className="animate-spin" /> : null}
      {children}
    </button>
  );
};
