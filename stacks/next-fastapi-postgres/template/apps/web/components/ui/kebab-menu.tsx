'use client';

import { MoreHorizontalIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from './button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from './dropdown-menu';

export interface KebabMenuProps {
  /** Accessible name naming the object, e.g. "Actions for Invoice 42". */
  label: string;
  /** `DropdownMenuItem`s; put a destructive item last, after a `DropdownMenuSeparator`. */
  children: ReactNode;
  align?: 'start' | 'end';
}

/** Row and card actions behind a "…" button (company kebab-menu). */
export const KebabMenu = ({ label, children, align = 'end' }: KebabMenuProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button type="button" variant="ghost" size="icon-sm" aria-label={label} className="text-muted-foreground data-[state=open]:bg-accent">
        <MoreHorizontalIcon />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align={align} className="w-44">{children}</DropdownMenuContent>
  </DropdownMenu>
);
