import { PlusIcon } from 'lucide-react';
import Link from 'next/link';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';

import { GalleryExample, GallerySection } from './gallery-section';

/** Page header, breadcrumb, empty state, loading states, avatar and separator. */
export const GalleryMisc = () => (
  <>
    <GallerySection id="page-header" title="Page header and breadcrumb" source="@/components/ui/{page-header,breadcrumb}">
      <div className="rounded-lg border p-5">
        <PageHeader
          className="pb-0"
          title="Acme rollout"
          titleAs="h2"
          description="Detail page: breadcrumb, title, description, actions (primary last)."
          breadcrumb={(
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem><BreadcrumbLink asChild><Link href="#page-header">Projects</Link></BreadcrumbLink></BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem><BreadcrumbPage>Acme rollout</BreadcrumbPage></BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          )}
          actions={(
            <>
              <Button variant="outline">Share</Button>
              <Button><PlusIcon />New task</Button>
            </>
          )}
        />
      </div>
    </GallerySection>

    <GallerySection id="empty-state" title="Empty state" source="@/components/ui/empty-state">
      <EmptyState
        titleAs="p"
        title="No projects yet"
        description="Projects group your tasks and invoices. Create one to get started."
        action={<Button><PlusIcon />Create project</Button>}
      />
    </GallerySection>

    <GallerySection id="loading" title="Loading" source="@/components/ui/{skeleton,spinner}">
      <GalleryExample title="Skeleton (shape of the content)" className="block">
        <div className="grid max-w-md gap-3">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <div className="flex items-center gap-3 pt-2">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
      </GalleryExample>
      <GalleryExample title="Spinner (inline, small areas)">
        <Spinner />
        <span className="text-sm text-muted-foreground">Checking availability…</span>
      </GalleryExample>
    </GallerySection>

    <GallerySection id="avatar" title="Avatar and separator" source="@/components/ui/{avatar,separator}">
      <GalleryExample title="Avatar (initials)">
        <Avatar><AvatarFallback>AL</AvatarFallback></Avatar>
        <Avatar className="size-10"><AvatarFallback>SP</AvatarFallback></Avatar>
      </GalleryExample>
      <GalleryExample title="Separator" className="block">
        <div className="grid max-w-md gap-3 text-sm">
          <p>Above</p>
          <Separator />
          <div className="flex h-5 items-center gap-3"><span>Left</span><Separator orientation="vertical" /><span>Right</span></div>
        </div>
      </GalleryExample>
    </GallerySection>
  </>
);
