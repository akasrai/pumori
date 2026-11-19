'use client';

import { AlertDialog as AlertDialogPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

import { buttonVariants } from './button';

/** Confirmation before a destructive or irreversible action (company confirmation-modal). */
export const AlertDialog = (props: ComponentProps<typeof AlertDialogPrimitive.Root>) => <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />;

export const AlertDialogTrigger = (props: ComponentProps<typeof AlertDialogPrimitive.Trigger>) => (
  <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
);

export const AlertDialogContent = ({ className, ...props }: ComponentProps<typeof AlertDialogPrimitive.Content>) => (
  <AlertDialogPrimitive.Portal>
    <AlertDialogPrimitive.Overlay
      data-slot="alert-dialog-overlay"
      className="fixed inset-0 z-50 bg-black/40 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
    />
    <AlertDialogPrimitive.Content
      data-slot="alert-dialog-content"
      className={cn(
        'fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-xl border bg-background p-5 shadow-popover duration-200 sm:max-w-md',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
        className,
      )}
      {...props}
    />
  </AlertDialogPrimitive.Portal>
);

export const AlertDialogHeader = ({ className, ...props }: ComponentProps<'div'>) => (
  <div data-slot="alert-dialog-header" className={cn('flex flex-col gap-2 text-left', className)} {...props} />
);

export const AlertDialogFooter = ({ className, ...props }: ComponentProps<'div'>) => (
  <div data-slot="alert-dialog-footer" className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)} {...props} />
);

export const AlertDialogTitle = ({ className, ...props }: ComponentProps<typeof AlertDialogPrimitive.Title>) => (
  <AlertDialogPrimitive.Title data-slot="alert-dialog-title" className={cn('text-title font-semibold tracking-tight', className)} {...props} />
);

export const AlertDialogDescription = ({ className, ...props }: ComponentProps<typeof AlertDialogPrimitive.Description>) => (
  <AlertDialogPrimitive.Description data-slot="alert-dialog-description" className={cn('text-sm text-muted-foreground', className)} {...props} />
);

/** The confirming button. Destructive by default: say what happens ("Delete project"), not "OK". */
export interface AlertDialogActionProps extends ComponentProps<typeof AlertDialogPrimitive.Action> {
  variant?: 'default' | 'destructive';
}

export const AlertDialogAction = ({ className, variant = 'destructive', ...props }: AlertDialogActionProps) => (
  <AlertDialogPrimitive.Action className={cn(buttonVariants({ variant }), className)} {...props} />
);

export const AlertDialogCancel = ({ className, ...props }: ComponentProps<typeof AlertDialogPrimitive.Cancel>) => (
  <AlertDialogPrimitive.Cancel className={cn(buttonVariants({ variant: 'outline' }), className)} {...props} />
);
