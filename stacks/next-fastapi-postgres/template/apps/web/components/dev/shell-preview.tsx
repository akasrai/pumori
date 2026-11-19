'use client';

import { BarChart3Icon, LayoutDashboardIcon, PlusIcon, RocketIcon, SettingsIcon } from 'lucide-react';
import { useState } from 'react';

import { AppShell } from '@/components/shell/app-shell';
import { ContextSwitcher } from '@/components/shell/context-switcher';
import type { ShellNavSection } from '@/components/shell/shell-nav-items';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { ROUTE, type ShellKind } from '@/lib/app-constants';

import { DeploymentsTable } from './gallery-deployments';

const DEMO_USER = { email: 'designer@example.com', name: 'Dana Designer' };
const PROJECTS = [
  { id: 'acme-web', label: 'acme-web' },
  { id: 'acme-api', label: 'acme-api' },
  { id: 'docs', label: 'docs' },
];

const previewNav = (shell: ShellKind): ShellNavSection[] => [
  {
    items: [
      { label: 'Overview', href: `${ROUTE.DEV_UI_SHELLS}/${shell}`, icon: LayoutDashboardIcon },
      { label: 'Deployments', href: '#deployments', icon: RocketIcon },
      { label: 'Analytics', href: '#analytics', icon: BarChart3Icon },
    ],
  },
  { label: 'Project', items: [{ label: 'Settings', href: '#settings', icon: SettingsIcon }] },
];

export interface ShellPreviewProps {
  shell: ShellKind;
}

/**
 * A realistic signed-in page inside one shell, with demo nav and a project switcher. Served full-page at
 * /dev/ui/shells/<shell> (the gallery frames it; e2e runs axe on it for both shells).
 */
export const ShellPreview = ({ shell }: ShellPreviewProps) => {
  const [project, setProject] = useState(PROJECTS[0]?.id ?? '');

  return (
    <AppShell
      shell={shell}
      user={DEMO_USER}
      nav={previewNav(shell)}
      contextSwitcher={(
        <ContextSwitcher
          label="Project"
          options={PROJECTS}
          value={project}
          onValueChange={setProject}
          footer={<DropdownMenuItem><PlusIcon />Create project</DropdownMenuItem>}
        />
      )}
    >
      <PageHeader
        title="Overview"
        description="Production deployment, usage and recent activity."
        actions={(
          <>
            <Button variant="outline">View logs</Button>
            <Button>Deploy</Button>
          </>
        )}
      />
      <div className="grid gap-8">
        <section id="analytics" aria-label="Analytics" className="grid scroll-mt-28 gap-4 sm:grid-cols-3">
          <StatCard label="Requests (24h)" value="1.2M" change="+8.2% vs yesterday" tone="positive" trend="up" />
          <StatCard label="p95 latency" value="182 ms" change="-12 ms vs yesterday" tone="positive" trend="down" />
          <StatCard label="Failed builds" value="1" href="#deployments" actionLabel="Review failed build" />
        </section>
        <section id="deployments" aria-labelledby="deployments-title" className="grid scroll-mt-28 gap-3">
          <h2 id="deployments-title" className="text-sm font-semibold">Deployments</h2>
          <DeploymentsTable />
        </section>
        <section id="settings" aria-label="Settings" className="scroll-mt-28">
          <Card>
            <CardHeader>
              <CardTitle>Project name</CardTitle>
              <CardDescription>Used in URLs and the dashboard.</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField label="Name" className="max-w-sm">
                <Input defaultValue={project} />
              </FormField>
            </CardContent>
            <CardFooter className="justify-end border-t">
              <Button>Save</Button>
            </CardFooter>
          </Card>
        </section>
      </div>
    </AppShell>
  );
};
