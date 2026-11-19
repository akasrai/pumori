'use client';

import { Tabs as TabsPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

export const Tabs = ({ className, ...props }: ComponentProps<typeof TabsPrimitive.Root>) => (
  <TabsPrimitive.Root data-slot="tabs" className={cn('flex flex-col gap-4', className)} {...props} />
);

/** Underline tabs: 14 px muted labels, the active one in foreground with a 2 px bar on the hairline below. */
export const TabsList = ({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) => (
  <TabsPrimitive.List
    data-slot="tabs-list"
    className={cn('inline-flex w-full items-center gap-6 overflow-x-auto border-b text-muted-foreground', className)}
    {...props}
  />
);

export const TabsTrigger = ({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) => (
  <TabsPrimitive.Trigger
    data-slot="tabs-trigger"
    className={cn(
      'focus-ring-inset relative -mb-px inline-flex h-row items-center justify-center gap-2 rounded-t-sm border-b-2 border-transparent px-0.5 text-sm font-medium whitespace-nowrap transition-colors duration-150 max-md:h-touch',
      'hover:text-foreground data-[state=active]:border-foreground data-[state=active]:text-foreground',
      'disabled:pointer-events-none disabled:opacity-50',
      '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4',
      className,
    )}
    {...props}
  />
);

export const TabsContent = ({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) => (
  <TabsPrimitive.Content data-slot="tabs-content" className={cn('flex-1 outline-none', className)} {...props} />
);
