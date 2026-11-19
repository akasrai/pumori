'use client';

import { AppShell } from '@/components/shell/app-shell';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageHeader } from '@/components/ui/page-header';

import { GalleryControls } from './gallery-controls';
import { GalleryData } from './gallery-data';
import { GalleryDenseTable } from './gallery-deployments';
import { GalleryFoundations } from './gallery-foundations';
import { GalleryMisc } from './gallery-misc';
import { GalleryOverlays } from './gallery-overlays';
import { GalleryShells } from './gallery-shells';

const DEMO_USER = { email: 'designer@example.com', name: 'Dana Designer' };

const SECTIONS = [
  { id: 'shells', label: 'App shells' },
  { id: 'theme', label: 'Theme' },
  { id: 'colors', label: 'Colours' },
  { id: 'density', label: 'Density' },
  { id: 'type', label: 'Typography' },
  { id: 'buttons', label: 'Button' },
  { id: 'badges', label: 'Badge' },
  { id: 'forms', label: 'Forms' },
  { id: 'alerts', label: 'Alert' },
  { id: 'cards', label: 'Card' },
  { id: 'stat-cards', label: 'Stat card' },
  { id: 'tabs', label: 'Tabs' },
  { id: 'table', label: 'Table' },
  { id: 'data-table', label: 'Data table' },
  { id: 'dense-table', label: 'Dense table' },
  { id: 'overlays', label: 'Overlays' },
  { id: 'page-header', label: 'Page header' },
  { id: 'empty-state', label: 'Empty state' },
  { id: 'loading', label: 'Loading' },
  { id: 'avatar', label: 'Avatar' },
] as const;

/** The whole gallery, rendered inside the product's real app shell (`APP_SHELL`); both shells are previewed in frames. */
export const UiGallery = () => (
  <AppShell user={DEMO_USER}>
    <PageHeader
      title="UI gallery"
      description="Every component in components/ui and the app shell around this page, with variants and states. Build screens only from these. See docs/design.md."
    />
    <Alert role="status" className="mb-6">
      <AlertDescription>Development only: this page is a 404 in production. The shell around it is the product&apos;s real app shell (APP_SHELL); the App shells section previews both.</AlertDescription>
    </Alert>
    <nav aria-label="Gallery sections" className="mb-8">
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {SECTIONS.map((section) => (
          <li key={section.id}>
            <a href={`#${section.id}`} className="focus-ring inline-flex h-7 items-center rounded-sm text-caption text-muted-foreground transition-colors duration-150 hover:text-foreground max-md:h-touch">
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
    <GalleryShells />
    <GalleryFoundations />
    <GalleryControls />
    <GalleryData />
    <GalleryDenseTable />
    <GalleryOverlays />
    <GalleryMisc />
  </AppShell>
);
