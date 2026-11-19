'use client';

import { Tooltip as TooltipPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/** Mounted once in the root layout; tooltips share its delay. */
export const TooltipProvider = ({ delayDuration = 200, ...props }: ComponentProps<typeof TooltipPrimitive.Provider>) => (
  <TooltipPrimitive.Provider data-slot="tooltip-provider" delayDuration={delayDuration} {...props} />
);

/** Supplementary hints only: never put the only copy of important information in a tooltip. */
export const Tooltip = (props: ComponentProps<typeof TooltipPrimitive.Root>) => <TooltipPrimitive.Root data-slot="tooltip" {...props} />;

export const TooltipTrigger = (props: ComponentProps<typeof TooltipPrimitive.Trigger>) => <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;

export const TooltipContent = ({ className, sideOffset = 4, children, ...props }: ComponentProps<typeof TooltipPrimitive.Content>) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      data-slot="tooltip-content"
      sideOffset={sideOffset}
      className={cn(
        'z-50 w-fit max-w-xs origin-(--radix-tooltip-content-transform-origin) rounded-sm bg-primary px-2 py-1 text-xs text-balance text-primary-foreground',
        'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
        className,
      )}
      {...props}
    >
      {children}
      <TooltipPrimitive.Arrow className="z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px] bg-primary fill-primary" />
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
);
