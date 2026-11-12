'use client';

import { ChevronsUpDownIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface ContextSwitcherOption {
  id: string;
  label: string;
}

export interface ContextSwitcherProps {
  /** What is being switched, e.g. "Project": names the menu ("Switch project") and its heading. */
  label: string;
  options: ContextSwitcherOption[];
  value: string;
  onValueChange: (id: string) => void;
  /** Extra items under a separator, e.g. `<DropdownMenuItem>Create project</DropdownMenuItem>`. */
  footer?: ReactNode;
}

/**
 * Team/project/workspace switcher for the shell's `contextSwitcher` slot (Vercel's team switcher):
 * the current one as a ghost button, the others in a menu.
 */
export const ContextSwitcher = ({ label, options, value, onValueChange, footer }: ContextSwitcherProps) => {
  const current = options.find((option) => option.id === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="max-w-56 justify-start gap-2 px-2 font-medium">
          <span className="sr-only">Switch {label.toLowerCase()}:</span>
          <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center rounded-full border bg-muted text-[10px] font-semibold text-foreground">
            {current?.label.charAt(0) ?? '?'}
          </span>
          <span className="truncate">{current?.label ?? `Choose ${label.toLowerCase()}`}</span>
          <ChevronsUpDownIcon aria-hidden="true" className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.id} value={option.id}>{option.label}</DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        {footer ? (
          <>
            <DropdownMenuSeparator />
            {footer}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
