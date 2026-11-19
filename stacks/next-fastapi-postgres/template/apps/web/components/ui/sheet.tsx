'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { XIcon } from 'lucide-react';
import { Dialog as SheetPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/** Side panel for create/edit and detail (company side-panel: right edge, sticky header and footer). */
export const Sheet = (props: ComponentProps<typeof SheetPrimitive.Root>) => <SheetPrimitive.Root data-slot="sheet" {...props} />;

export const SheetTrigger = (props: ComponentProps<typeof SheetPrimitive.Trigger>) => <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;

export const SheetClose = (props: ComponentProps<typeof SheetPrimitive.Close>) => <SheetPrimitive.Close data-slot="sheet-close" {...props} />;

const sheetVariants = cva(
  'fixed z-50 flex flex-col bg-background shadow-popover transition ease-in-out data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=open]:animate-in data-[state=open]:duration-300',
  {
    variants: {
      side: {
        right: 'inset-y-0 right-0 h-full w-full border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
        left: 'inset-y-0 left-0 h-full w-72 max-w-[85%] border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left',
      },
      size: {
        sm: 'sm:max-w-[480px]',
        md: 'sm:max-w-[640px]',
        lg: 'sm:max-w-[860px]',
      },
    },
    defaultVariants: { side: 'right', size: 'sm' },
  },
);

export interface SheetContentProps extends ComponentProps<typeof SheetPrimitive.Content>, VariantProps<typeof sheetVariants> {}

export const SheetContent = ({ className, children, side, size, ...props }: SheetContentProps) => (
  <SheetPrimitive.Portal>
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className="fixed inset-0 z-50 bg-black/40 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
    />
    <SheetPrimitive.Content data-slot="sheet-content" className={cn(sheetVariants({ side, size }), className)} {...props}>
      {children}
      <SheetPrimitive.Close className="focus-ring absolute top-3 right-3 inline-flex size-control-sm items-center max-md:size-touch justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground [&_svg]:size-4">
        <XIcon />
        <span className="sr-only">Close</span>
      </SheetPrimitive.Close>
    </SheetPrimitive.Content>
  </SheetPrimitive.Portal>
);

export const SheetHeader = ({ className, ...props }: ComponentProps<'div'>) => (
  <div data-slot="sheet-header" className={cn('flex flex-col gap-1 border-b px-5 py-4 pr-14', className)} {...props} />
);

/** Scrolling middle of the panel; header and footer stay put. */
export const SheetBody = ({ className, ...props }: ComponentProps<'div'>) => (
  <div data-slot="sheet-body" className={cn('flex-1 overflow-y-auto px-5 py-5', className)} {...props} />
);

export const SheetFooter = ({ className, ...props }: ComponentProps<'div'>) => (
  <div data-slot="sheet-footer" className={cn('flex flex-col-reverse gap-2 border-t px-5 py-4 sm:flex-row sm:justify-end', className)} {...props} />
);

export const SheetTitle = ({ className, ...props }: ComponentProps<typeof SheetPrimitive.Title>) => (
  <SheetPrimitive.Title data-slot="sheet-title" className={cn('text-title font-semibold tracking-tight text-foreground', className)} {...props} />
);

export const SheetDescription = ({ className, ...props }: ComponentProps<typeof SheetPrimitive.Description>) => (
  <SheetPrimitive.Description data-slot="sheet-description" className={cn('text-sm text-muted-foreground', className)} {...props} />
);
