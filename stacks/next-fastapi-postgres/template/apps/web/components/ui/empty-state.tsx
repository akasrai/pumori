import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  /** What is empty, as a statement: "No projects yet". */
  title: string;
  /** One sentence: why it is empty or what the user gets by acting. */
  description?: ReactNode;
  /** The next action, usually one `<Button>` ("Create project"). */
  action?: ReactNode;
  /** Element of the title: h2 by default; h1 when the empty state is the whole page (404). */
  titleAs?: 'h1' | 'h2' | 'h3' | 'p';
  /** `center` (default) or `start` (left-aligned, for empty sections inside a page). */
  align?: 'center' | 'start';
  className?: string;
}

/**
 * Empty list, empty search result or first-run state: plain text in a hairline box (no icon, no
 * illustration, no dashed border). Always offer the next action when there is one.
 */
export const EmptyState = ({ title, description, action, titleAs: Title = 'h2', align = 'center', className }: EmptyStateProps) => (
  <div
    data-slot="empty-state"
    className={cn(
      'flex flex-col gap-4 rounded-lg border px-6 py-12',
      align === 'center' ? 'items-center text-center' : 'items-start text-left',
      className,
    )}
  >
    <div className="grid max-w-md gap-1 text-balance">
      <Title className="text-sm font-semibold text-foreground">{title}</Title>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
    </div>
    {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
  </div>
);
