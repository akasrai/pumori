import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface GallerySectionProps {
  id: string;
  title: string;
  /** Which file(s) to import from. */
  source: string;
  children: ReactNode;
}

/** One block of the UI gallery: heading, source path, and the examples. */
export const GallerySection = ({ id, title, source, children }: GallerySectionProps) => (
  <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-28 border-t py-10 first:border-t-0 first:pt-0">
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
      <h2 id={`${id}-title`} className="text-title font-semibold tracking-tight">{title}</h2>
      <code className="font-mono text-xs text-muted-foreground">{source}</code>
    </div>
    <div className="grid gap-6">{children}</div>
  </section>
);

export interface GalleryExampleProps {
  title: string;
  children: ReactNode;
  className?: string;
}

/** A labelled example inside a section. */
export const GalleryExample = ({ title, children, className }: GalleryExampleProps) => (
  <div className="grid gap-3">
    <h3 className="text-caption text-muted-foreground">{title}</h3>
    <div className={cn('flex flex-wrap items-center gap-3', className)}>{children}</div>
  </div>
);
