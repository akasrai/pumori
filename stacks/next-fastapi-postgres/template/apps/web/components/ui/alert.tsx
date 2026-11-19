import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

export const alertVariants = cva(
  'relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-lg border px-4 py-3 text-sm has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current',
  {
    variants: {
      variant: {
        default: 'bg-card text-card-foreground [&>svg]:text-muted-foreground',
        info: 'border-info-border bg-info-subtle text-info-subtle-foreground',
        success: 'border-success-border bg-success-subtle text-success-subtle-foreground',
        warning: 'border-warning-border bg-warning-subtle text-warning-subtle-foreground',
        destructive: 'border-destructive-border bg-destructive-subtle text-destructive-subtle-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface AlertProps extends ComponentProps<'div'>, VariantProps<typeof alertVariants> {}

/** Inline message (company `Alert.Info` etc.). `role="alert"`: use it for errors the user must notice now. */
export const Alert = ({ className, variant, role = 'alert', ...props }: AlertProps) => (
  <div data-slot="alert" role={role} className={cn(alertVariants({ variant }), className)} {...props} />
);

export const AlertTitle = ({ className, ...props }: ComponentProps<'div'>) => (
  <div data-slot="alert-title" className={cn('col-start-2 line-clamp-1 min-h-4 font-medium', className)} {...props} />
);

export const AlertDescription = ({ className, ...props }: ComponentProps<'div'>) => (
  <div data-slot="alert-description" className={cn('col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed', className)} {...props} />
);
