import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { APP_NAME } from '@/lib/app-constants';

import { ShellMark, ShellSkipLink } from './shell-parts';

export interface FocusShellProps {
  /** Where the back arrow goes (the list the user came from). Omit to hide the arrow. */
  backHref?: string;
  /** The brand at the far left. Defaults to the product mark; pass the company logo when the product has one. */
  logo?: ReactNode;
  /** The document's title, e.g. the assessment name, shown next to the logo. */
  title: string;
  /** A status badge shown right after the title (e.g. "Drafting"). */
  status?: ReactNode;
  /**
   * Optional second fixed row under the header: tabs or underline menu on the left (`toolbarStart`), the page's
   * action buttons on the right (`toolbarEnd`), on one line.
   */
  toolbarStart?: ReactNode;
  toolbarEnd?: ReactNode;
  /** Left pane: a navigation tree. It scrolls on its own. Omit for a single-pane page. */
  nav?: ReactNode;
  /** Width of the left pane (default 400 px, like a document outline). */
  navWidthClassName?: string;
  children: ReactNode;
}

/**
 * Full-screen layout for document-like pages (a report, a drafting page, a reader). The window never scrolls:
 * - header: logo, title and status; no app navigation, no context switcher and no account menu;
 * - optional fixed toolbar: tabs left, actions right, on one line;
 * - the left tree and the main content each scroll on their own.
 *
 * See docs/design.md § Focus layout.
 */
export const FocusShell = ({
  backHref,
  logo,
  title,
  status,
  toolbarStart,
  toolbarEnd,
  nav,
  navWidthClassName = 'w-[400px]',
  children,
}: FocusShellProps) => (
  <div className="flex h-dvh flex-col overflow-hidden bg-background">
    <ShellSkipLink />
    <header className="flex h-16 shrink-0 items-center gap-3 border-b px-4">
      {backHref ? (
        <Link href={backHref} aria-label="Back" className="focus-ring flex size-control items-center justify-center rounded-md text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
        </Link>
      ) : null}
      {logo ?? <ShellMark productName={APP_NAME} />}
      <div className="flex min-w-0 items-center gap-2">
        <h1 className="truncate text-base font-semibold">{title}</h1>
        {status}
      </div>
    </header>
    {toolbarStart || toolbarEnd ? (
      <div className="flex h-12 shrink-0 items-center gap-4 border-b px-4">
        <div className="flex min-w-0 flex-1 items-center self-stretch">{toolbarStart}</div>
        {toolbarEnd ? <div className="flex shrink-0 items-center gap-2">{toolbarEnd}</div> : null}
      </div>
    ) : null}
    <div className="flex min-h-0 flex-1">
      {nav ? (
        <nav aria-label="Document outline" className={`${navWidthClassName} shrink-0 overflow-y-auto overscroll-contain border-r`}>
          {nav}
        </nav>
      ) : null}
      <main id="main" className="min-w-0 flex-1 overflow-y-auto overscroll-contain">
        {children}
      </main>
    </div>
  </div>
);
