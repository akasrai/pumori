import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import Link from 'next/link';
import type { Key, ReactNode } from 'react';

import { formatNumber } from '@/lib/format-utils';
import { cn } from '@/lib/utils';

import { Button } from './button';
import { Skeleton } from './skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';

const SKELETON_ROWS = 5;

export interface DataTableColumn<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Right-align numbers and money so digits line up. */
  align?: 'left' | 'right';
  /** Hide on small screens (`hidden md:table-cell`) for secondary columns. */
  hideOnMobile?: boolean;
  className?: string;
}

/**
 * Previous/next pagination that works for keyset (cursor) and offset paging. Give hrefs for URL-driven
 * paging from a Server Component (`?cursor=...`), or handlers for client state. Neither = disabled.
 */
export interface DataTablePaginationProps {
  /** 1-based index of the first and last row shown. */
  from: number;
  to: number;
  /** Total rows when known (offset paging); omit for keyset paging. */
  total?: number;
  previousHref?: string;
  nextHref?: string;
  onPrevious?: () => void;
  onNext?: () => void;
  /** Accessible name of the pagination landmark; `DataTable` sets "<table label> pagination" so several tables on a page stay distinct. */
  label?: string;
  className?: string;
}

interface PageButtonProps {
  label: string;
  icon: ReactNode;
  href?: string;
  onClick?: () => void;
}

const PageButton = ({ label, icon, href, onClick }: PageButtonProps) => {
  if (href) {
    return (
      <Button asChild variant="outline" size="icon-sm" aria-label={label}>
        <Link href={href}>{icon}</Link>
      </Button>
    );
  }

  return (
    <Button type="button" variant="outline" size="icon-sm" aria-label={label} onClick={onClick} disabled={!onClick}>
      {icon}
    </Button>
  );
};

/** "1–10 of 42" plus previous/next buttons (company table-pagination, right-aligned). */
export const DataTablePagination = ({ from, to, total, previousHref, nextHref, onPrevious, onNext, label = 'Pagination', className }: DataTablePaginationProps) => (
  <nav aria-label={label} className={cn('flex items-center justify-end gap-3 text-caption', className)}>
    <p className="text-muted-foreground tabular-nums">
      {formatNumber(from)}–{formatNumber(to)}
      {total === undefined ? null : <> of <span className="text-foreground">{formatNumber(total)}</span></>}
    </p>
    <div className="flex items-center gap-1">
      <PageButton label="Previous page" icon={<ChevronLeftIcon />} href={previousHref} onClick={onPrevious} />
      <PageButton label="Next page" icon={<ChevronRightIcon />} href={nextHref} onClick={onNext} />
    </div>
  </nav>
);

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => Key;
  /** Accessible name of the table, e.g. "Invoices". */
  label: string;
  isLoading?: boolean;
  /** Rendered in place of the rows when `rows` is empty (use `<EmptyState />`). */
  empty?: ReactNode;
  /** Filters and search above the table (Input, Select, Button). */
  toolbar?: ReactNode;
  pagination?: DataTablePaginationProps;
  /** Marks a row as selected (e.g. the one open in a side panel). */
  isRowSelected?: (row: T) => boolean;
  className?: string;
}

/**
 * Table + toolbar + loading skeleton + empty state + pagination. No client state of its own, so it
 * renders in Server Components; keep page/filter state in the URL or in the calling client component.
 */
export const DataTable = <T,>({
  columns, rows, getRowKey, label, isLoading = false, empty, toolbar, pagination, isRowSelected, className,
}: DataTableProps<T>) => {
  const cellClass = (column: DataTableColumn<T>) => cn(
    column.align === 'right' ? 'text-right tabular-nums' : '',
    column.hideOnMobile ? 'hidden md:table-cell' : '',
    column.className,
  );

  const body = () => {
    if (isLoading) {
      return Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <TableRow key={index} className="hover:bg-transparent">
          {columns.map((column) => (
            <TableCell key={column.id} className={cellClass(column)}><Skeleton className="h-4 w-full" /></TableCell>
          ))}
        </TableRow>
      ));
    }

    if (rows.length === 0) {
      return (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={columns.length} className="p-0 whitespace-normal">
            {empty ?? <p className="py-10 text-center text-sm text-muted-foreground">No results.</p>}
          </TableCell>
        </TableRow>
      );
    }

    return rows.map((row) => (
      <TableRow key={getRowKey(row)} data-state={isRowSelected?.(row) ? 'selected' : undefined}>
        {columns.map((column) => <TableCell key={column.id} className={cellClass(column)}>{column.cell(row)}</TableCell>)}
      </TableRow>
    ));
  };

  return (
    <div data-slot="data-table" className={cn('grid gap-3', className)}>
      {toolbar ? <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">{toolbar}</div> : null}
      <div className="overflow-hidden rounded-lg border">
        <Table aria-label={label} aria-busy={isLoading || undefined}>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => <TableHead key={column.id} className={cellClass(column)}>{column.header}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>{body()}</TableBody>
        </Table>
      </div>
      {pagination && !isLoading && rows.length > 0 ? <DataTablePagination label={`${label} pagination`} {...pagination} /> : null}
    </div>
  );
};
