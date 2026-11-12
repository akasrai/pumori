import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/** shadcn/ui Table: compact 40 px rows, 13 px muted header (no fill), hairline row dividers, #fafafa row hover, no zebra. Scrolls inside its own box. */
export const Table = ({ className, ...props }: ComponentProps<'table'>) => (
  <div data-slot="table-container" className="relative w-full overflow-x-auto">
    <table data-slot="table" className={cn('w-full caption-bottom text-sm', className)} {...props} />
  </div>
);

export const TableHeader = ({ className, ...props }: ComponentProps<'thead'>) => (
  <thead data-slot="table-header" className={cn('[&_tr]:border-b', className)} {...props} />
);

export const TableBody = ({ className, ...props }: ComponentProps<'tbody'>) => (
  <tbody data-slot="table-body" className={cn('[&_tr:last-child]:border-0', className)} {...props} />
);

export const TableFooter = ({ className, ...props }: ComponentProps<'tfoot'>) => (
  <tfoot data-slot="table-footer" className={cn('border-t font-medium [&>tr]:last:border-b-0', className)} {...props} />
);

export const TableRow = ({ className, ...props }: ComponentProps<'tr'>) => (
  <tr data-slot="table-row" className={cn('border-b transition-colors duration-150 hover:bg-surface data-[state=selected]:bg-selected', className)} {...props} />
);

export const TableHead = ({ className, ...props }: ComponentProps<'th'>) => (
  <th
    data-slot="table-head"
    className={cn('h-control px-3 text-left align-middle text-caption font-normal whitespace-nowrap text-muted-foreground [&:has([role=checkbox])]:pr-0', className)}
    {...props}
  />
);

export const TableCell = ({ className, ...props }: ComponentProps<'td'>) => (
  <td data-slot="table-cell" className={cn('h-row px-3 py-1 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0', className)} {...props} />
);

export const TableCaption = ({ className, ...props }: ComponentProps<'caption'>) => (
  <caption data-slot="table-caption" className={cn('mt-3 text-sm text-muted-foreground', className)} {...props} />
);
