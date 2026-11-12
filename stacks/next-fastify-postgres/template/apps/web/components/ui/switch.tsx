'use client';

import { Switch as SwitchPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

export const Switch = ({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) => (
  <SwitchPrimitive.Root
    data-slot="switch"
    className={cn(
      'focus-ring peer relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent transition-colors duration-150',
      'data-[state=checked]:bg-primary data-[state=unchecked]:bg-border-strong',
      'disabled:cursor-not-allowed disabled:opacity-50',
      "after:absolute after:-inset-3 after:content-['']",
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      data-slot="switch-thumb"
      className="pointer-events-none block size-4 rounded-full bg-background ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0.5"
    />
  </SwitchPrimitive.Root>
);
