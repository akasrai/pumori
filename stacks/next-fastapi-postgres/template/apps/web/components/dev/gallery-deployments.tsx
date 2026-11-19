'use client';

import { GitBranchIcon, SearchIcon } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { KebabMenu } from '@/components/ui/kebab-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatRelativeTime } from '@/lib/format-utils';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

import { GalleryExample, GallerySection } from './gallery-section';

const DEPLOY_STATUS = { READY: 'ready', BUILDING: 'building', ERROR: 'error', CANCELED: 'canceled' } as const;
type DeployStatus = (typeof DEPLOY_STATUS)[keyof typeof DEPLOY_STATUS];

const DEPLOY_ENV = { PRODUCTION: 'production', PREVIEW: 'preview' } as const;
type DeployEnv = (typeof DEPLOY_ENV)[keyof typeof DEPLOY_ENV];

interface Deployment {
  id: string;
  env: DeployEnv;
  status: DeployStatus;
  branch: string;
  commit: string;
  durationSeconds: number;
  createdAt: number;
  author: string;
}

// Status dot + word (never colour alone). The dot is decorative.
const STATUS_META = {
  ready: { label: 'Ready', dot: 'bg-success' },
  building: { label: 'Building', dot: 'bg-warning' },
  error: { label: 'Error', dot: 'bg-destructive' },
  canceled: { label: 'Canceled', dot: 'bg-border-strong' },
} as const;

const ENV_LABEL = { production: 'Production', preview: 'Preview' } as const;

// A fixed "now" keeps server and client renders identical (no hydration mismatch).
const DEMO_NOW = Date.UTC(2026, 10, 7, 12, 0, 0);
const MINUTE_MS = 60_000;
const PAGE_SIZE = 8;
const ALL = 'all';
const BRANCHES = ['main', 'feat/billing-v2', 'fix/login-redirect', 'main', 'chore/deps', 'feat/onboarding'];
const COMMITS = ['Add invoice export', 'Fix redirect after login', 'Bump dependencies', 'Tighten table density', 'New onboarding checklist', 'Cache project list'];
const AUTHORS = ['ana', 'sam', 'lee', 'kim'];
const STATUSES: DeployStatus[] = ['ready', 'ready', 'building', 'ready', 'error', 'ready', 'canceled'];

const DEPLOYMENTS: Deployment[] = Array.from({ length: 23 }, (_, index) => ({
  id: `dpl-${(0x3f2a9 + index * 7919).toString(36)}`,
  env: index % 3 === 0 ? 'production' : 'preview',
  status: STATUSES[index % STATUSES.length] ?? 'ready',
  branch: BRANCHES[index % BRANCHES.length] ?? 'main',
  commit: COMMITS[index % COMMITS.length] ?? 'Update',
  durationSeconds: 38 + ((index * 37) % 140),
  createdAt: DEMO_NOW - (index * 47 + 3) * MINUTE_MS,
  author: AUTHORS[index % AUTHORS.length] ?? 'ana',
}));

const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);

  return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
};

const COLUMNS: DataTableColumn<Deployment>[] = [
  {
    id: 'deployment',
    header: 'Deployment',
    cell: (row) => <a href="#dense-table" className="font-mono text-caption text-foreground underline-offset-4 hover:underline">{row.id}</a>,
  },
  { id: 'env', header: 'Environment', cell: (row) => ENV_LABEL[row.env], hideOnMobile: true },
  {
    id: 'status',
    header: 'Status',
    cell: (row) => (
      <span className="inline-flex items-center gap-2">
        <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', STATUS_META[row.status].dot)} />
        {STATUS_META[row.status].label}
      </span>
    ),
  },
  {
    id: 'source',
    header: 'Source',
    hideOnMobile: true,
    cell: (row) => (
      <span className="flex max-w-72 items-center gap-2">
        <Icon icon={GitBranchIcon} size="sm" />
        <span className="font-medium">{row.branch}</span>
        <span className="truncate text-muted-foreground">{row.commit}</span>
      </span>
    ),
  },
  { id: 'duration', header: 'Duration', align: 'right', hideOnMobile: true, cell: (row) => formatDuration(row.durationSeconds) },
  {
    id: 'created',
    header: 'Created',
    hideOnMobile: true,
    cell: (row) => <span className="text-muted-foreground">{formatRelativeTime(new Date(row.createdAt), DEMO_NOW)} by {row.author}</span>,
  },
  {
    id: 'actions',
    header: <span className="sr-only">Actions</span>,
    className: 'w-12',
    cell: (row) => (
      <KebabMenu label={`Actions for ${row.id}`}>
        <DropdownMenuItem>Inspect deployment</DropdownMenuItem>
        <DropdownMenuItem>Copy URL</DropdownMenuItem>
        <DropdownMenuItem>Redeploy</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
      </KebabMenu>
    ),
  },
];

/** Vercel-style deployments list: dense 40 px rows, toolbar filters, row kebab menu, pagination. */
export const DeploymentsTable = () => {
  const [query, setQuery] = useState('');
  const [env, setEnv] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);
  const [page, setPage] = useState(0);
  const needle = query.trim().toLowerCase();
  const filtered = DEPLOYMENTS.filter((row) => (
    (needle === '' || row.branch.includes(needle) || row.id.includes(needle) || row.commit.toLowerCase().includes(needle))
    && (env === ALL || row.env === env)
    && (status === ALL || row.status === status)
  ));
  const rows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const hasNext = (page + 1) * PAGE_SIZE < filtered.length;
  const isFiltered = needle !== '' || env !== ALL || status !== ALL;

  const clearFilters = () => {
    setQuery('');
    setEnv(ALL);
    setStatus(ALL);
    setPage(0);
  };

  return (
    <DataTable
      label="Deployments"
      columns={COLUMNS}
      rows={rows}
      getRowKey={(row) => row.id}
      toolbar={(
        <>
          <div className="relative sm:w-64">
            <Icon icon={SearchIcon} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2" />
            <Input
              aria-label="Search deployments"
              placeholder="Branch, commit or ID"
              className="pl-9"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
              }}
            />
          </div>
          <Select value={env} onValueChange={(value) => {
            setEnv(value);
            setPage(0);
          }}
          >
            <SelectTrigger aria-label="Filter by environment" className="sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All environments</SelectItem>
              <SelectItem value={DEPLOY_ENV.PRODUCTION}>Production</SelectItem>
              <SelectItem value={DEPLOY_ENV.PREVIEW}>Preview</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(value) => {
            setStatus(value);
            setPage(0);
          }}
          >
            <SelectTrigger aria-label="Filter by status" className="sm:w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {Object.values(DEPLOY_STATUS).map((value) => <SelectItem key={value} value={value}>{STATUS_META[value].label}</SelectItem>)}
            </SelectContent>
          </Select>
          {isFiltered ? <Button variant="ghost" onClick={clearFilters}>Clear filters</Button> : null}
        </>
      )}
      empty={(
        <EmptyState
          titleAs="p"
          className="border-0"
          title="No deployments match"
          description="Try another branch, environment or status."
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

/** Gallery section: the dense data table pattern. */
export const GalleryDenseTable = () => (
  <GallerySection id="dense-table" title="Dense data table" source="@/components/ui/data-table (+ kebab-menu, select, input)">
    <GalleryExample title="Deployments list: toolbar filters, 40 px rows, mono IDs, status dot + word, row kebab menu, pagination" className="block">
      <DeploymentsTable />
    </GalleryExample>
  </GallerySection>
);
