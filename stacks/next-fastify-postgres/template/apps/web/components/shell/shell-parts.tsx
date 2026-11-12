import Link from 'next/link';

import { ROUTE } from '@/lib/app-constants';
import { cn } from '@/lib/utils';

export interface ShellMarkProps {
  productName: string;
  /** `sm` 20 px (shell headers, default); `lg` 32 px (auth pages). */
  size?: 'sm' | 'lg';
  className?: string;
}

/** The product's mark: its initial in a crisp near-black square. Decorative; the name is always next to it or in a label. */
export const ShellMark = ({ productName, size = 'sm', className }: ShellMarkProps) => (
  <span
    aria-hidden="true"
    className={cn(
      'flex shrink-0 items-center justify-center bg-primary font-bold text-primary-foreground select-none',
      size === 'lg' ? 'size-8 rounded-md text-base' : 'size-5 rounded-sm text-xs',
      className,
    )}
  >
    {productName.charAt(0)}
  </span>
);

export interface ShellBrandProps {
  productName: string;
  /** Show only the mark below `sm` (the name stays readable to screen readers). */
  hideNameOnMobile?: boolean;
  className?: string;
}

/** Mark + product name in 14 px semibold, linking home. Shared by both shells. */
export const ShellBrand = ({ productName, hideNameOnMobile = false, className }: ShellBrandProps) => (
  <Link
    href={ROUTE.HOME}
    className={cn(
      'focus-ring flex shrink-0 items-center gap-2 rounded-sm text-sm font-semibold tracking-tight text-foreground max-md:min-h-touch',
      className,
    )}
  >
    <ShellMark productName={productName} />
    <span className={hideNameOnMobile ? 'max-sm:sr-only' : ''}>{productName}</span>
  </Link>
);

/** First focusable element of every shell: jumps to `<main id="main">`. */
export const ShellSkipLink = () => (
  <a
    href="#main"
    className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
  >
    Skip to content
  </a>
);
