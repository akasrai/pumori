'use client';

import { SearchIcon } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { KebabMenu } from '@/components/ui/kebab-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatCard } from '@/components/ui/stat-card';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate, formatMoney } from '@/lib/format-utils';

import { GalleryExample, GallerySection } from './gallery-section';

const INVOICE_STATUS = { PAID: 'paid', PENDING: 'pending', OVERDUE: 'overdue' } as const;
type InvoiceStatus = (typeof INVOICE_STATUS)[keyof typeof INVOICE_STATUS];

interface Invoice {
  id: string;
  customer: string;
  status: InvoiceStatus;
  amountMinor: number;
  issuedAt: string;
}

const STATUS_BADGE = {
  paid: { label: 'Paid', variant: 'success' },
  pending: { label: 'Pending', variant: 'warning' },
  overdue: { label: 'Overdue', variant: 'destructive' },
} as const;

const CUSTOMERS = ['Acme Corp', 'Globex', 'Initech', 'Umbrella', 'Hooli', 'Stark Industries', 'Wayne Enterprises'];
const STATUSES: InvoiceStatus[] = Object.values(INVOICE_STATUS);
const PAGE_SIZE = 5;
const ALL = 'all';

const INVOICES: Invoice[] = Array.from({ length: 17 }, (_, index) => ({
  id: `INV-${String(1040 + index)}`,
  customer: CUSTOMERS[index % CUSTOMERS.length] ?? 'Acme Corp',
  status: STATUSES[index % STATUSES.length] ?? 'paid',
  amountMinor: 12_500 + index * 7_315,
  issuedAt: new Date(Date.UTC(2026, 9, 28 - index)).toISOString(),
}));

const COLUMNS: DataTableColumn<Invoice>[] = [
  { id: 'id', header: 'Invoice', cell: (row) => <a href="#data-table" className="font-mono text-caption text-foreground underline-offset-4 hover:underline">{row.id}</a> },
  { id: 'customer', header: 'Customer', cell: (row) => row.customer },
  { id: 'status', header: 'Status', cell: (row) => <Badge dot variant={STATUS_BADGE[row.status].variant}>{STATUS_BADGE[row.status].label}</Badge> },
  { id: 'issued', header: 'Issued', cell: (row) => <span className="text-muted-foreground tabular-nums">{formatDate(row.issuedAt, 'UTC')}</span>, hideOnMobile: true },
  { id: 'amount', header: 'Amount', align: 'right', cell: (row) => formatMoney(row.amountMinor) },
  {
    id: 'actions',
    header: <span className="sr-only">Actions</span>,
    className: 'w-12',
    cell: (row) => (
      <KebabMenu label={`Actions for ${row.id}`}>
        <DropdownMenuItem>View</DropdownMenuItem>
        <DropdownMenuItem>Send reminder</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
      </KebabMenu>
    ),
  },
];

const InvoiceTableDemo = () => {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<string>(ALL);
  const [page, setPage] = useState(0);
  const filtered = INVOICES.filter((invoice) => (
    invoice.customer.toLowerCase().includes(query.trim().toLowerCase()) && (status === ALL || invoice.status === status)
  ));
  const rows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const hasNext = (page + 1) * PAGE_SIZE < filtered.length;

  const clearFilters = () => {
    setQuery('');
    setStatus(ALL);
    setPage(0);
  };

  return (
    <DataTable
      label="Invoices"
      columns={COLUMNS}
      rows={rows}
      getRowKey={(row) => row.id}
      isRowSelected={(row) => row.id === 'INV-1041'}
      toolbar={(
        <>
          <div className="relative sm:w-64">
            <Icon icon={SearchIcon} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2" />
            <Input
              aria-label="Search customers"
              placeholder="Search customers"
              className="pl-9"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
              }}
            />
          </div>
          <Select value={status} onValueChange={(value) => {
            setStatus(value);
            setPage(0);
          }}
          >
            <SelectTrigger aria-label="Filter by status" className="sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {STATUSES.map((value) => <SelectItem key={value} value={value}>{STATUS_BADGE[value].label}</SelectItem>)}
            </SelectContent>
          </Select>
          {query || status !== ALL ? <Button variant="ghost" onClick={clearFilters}>Clear filters</Button> : null}
        </>
      )}
      empty={(
        <EmptyState
          titleAs="p"
          className="border-0"
          title="No invoices match"
          description="Try another customer name or status."
          action={<Button variant="outline" onClick={clearFilters}>Clear filters</Button>}
        />
      )}
      pagination={{
        from: page * PAGE_SIZE + 1,
        to: page * PAGE_SIZE + rows.length,
        total: filtered.length,
        onPrevious: page > 0 ? () => setPage(page - 1) : undefined,
        onNext: hasNext ? () => setPage(page + 1) : undefined,
      }}
    />
  );
};

/** Cards, stat cards, tabs, tables and the data table. */
export const GalleryData = () => (
  <>
    <GallerySection id="cards" title="Card" source="@/components/ui/card">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Billing</CardTitle>
            <CardDescription>Plan, payment method and invoices.</CardDescription>
            <CardAction><Button variant="outline" size="sm">Manage</Button></CardAction>
          </CardHeader>
          <CardContent className="text-sm">Pro plan · renews on Dec 1, 2026.</CardContent>
        </Card>
        <Card>
          <CardHeader className="border-b">
            <CardTitle>With footer</CardTitle>
            <CardDescription>Header divider, content, actions at the bottom.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Cards group one topic. Do not nest cards.</CardContent>
          <CardFooter className="justify-end gap-2 border-t">
            <Button variant="outline">Cancel</Button>
            <Button>Save</Button>
          </CardFooter>
        </Card>
      </div>
    </GallerySection>

    <GallerySection id="stat-cards" title="Stat card" source="@/components/ui/stat-card">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenue" value={formatMoney(4_823_150)} change="+12.4% vs last month" tone="positive" trend="up" />
        <StatCard label="Active users" value="1,284" change="-3.1% vs last month" tone="negative" trend="down" />
        <StatCard label="Overdue invoices" value="7" href="#data-table" actionLabel="Review overdue" />
        <StatCard label="Loading" value="0" isLoading />
      </div>
    </GallerySection>

    <GallerySection id="tabs" title="Tabs" source="@/components/ui/tabs">
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="disabled" disabled>Disabled</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="text-sm text-muted-foreground">Overview content.</TabsContent>
        <TabsContent value="activity" className="text-sm text-muted-foreground">Activity content.</TabsContent>
        <TabsContent value="settings" className="text-sm text-muted-foreground">Settings content.</TabsContent>
      </Tabs>
    </GallerySection>

    <GallerySection id="table" title="Table" source="@/components/ui/table">
      <div className="rounded-lg border">
        <Table>
          <TableCaption className="sr-only">Team members</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Seats</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow><TableCell>Ana Lima</TableCell><TableCell>Owner</TableCell><TableCell className="text-right tabular-nums">3</TableCell></TableRow>
            <TableRow><TableCell>Sam Park</TableCell><TableCell>Member</TableCell><TableCell className="text-right tabular-nums">1</TableCell></TableRow>
          </TableBody>
        </Table>
      </div>
    </GallerySection>

    <GallerySection id="data-table" title="Data table" source="@/components/ui/data-table">
      <GalleryExample title="Filters, row actions, selected row, pagination" className="block">
        <InvoiceTableDemo />
      </GalleryExample>
      <div className="grid gap-6 lg:grid-cols-2">
        <GalleryExample title="Loading" className="block">
          <DataTable label="Invoices (loading)" columns={COLUMNS.slice(0, 3)} rows={[]} getRowKey={(row) => row.id} isLoading />
        </GalleryExample>
        <GalleryExample title="Empty (first run)" className="block">
          <DataTable
            label="Invoices (empty)"
            columns={COLUMNS.slice(0, 3)}
            rows={[]}
            getRowKey={(row) => row.id}
            empty={<EmptyState titleAs="p" className="border-0" title="No invoices yet" description="Invoices you create appear here." action={<Button>Create invoice</Button>} />}
          />
        </GalleryExample>
      </div>
    </GallerySection>
  </>
);
