import type { LucideIcon, LucideProps } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface IconProps extends Omit<LucideProps, 'size'> {
  /** A lucide-react icon, e.g. `GitBranchIcon`. */
  icon: LucideIcon;
  /** `md` 16 px (default); `sm` 14 px for dense rows and inline text. */
  size?: 'sm' | 'md';
}

/**
 * The one way to draw a standalone icon: lucide at a 1.5 stroke, 16 px (14 px in dense rows), muted grey,
 * decorative (aria-hidden) unless you pass an `aria-label`. Use icons only where they add meaning.
 */
export const Icon = ({ icon: Glyph, size = 'md', strokeWidth = 1.5, className, ...props }: IconProps) => (
  <Glyph
    aria-hidden={props['aria-label'] ? undefined : true}
    strokeWidth={strokeWidth}
    className={cn('shrink-0 text-muted-foreground', size === 'sm' ? 'size-3.5' : 'size-4', className)}
    {...props}
  />
);
