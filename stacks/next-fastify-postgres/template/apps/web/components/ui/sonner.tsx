'use client';

import { CircleAlertIcon, CircleCheckIcon, InfoIcon, Loader2Icon, TriangleAlertIcon } from 'lucide-react';
import type { CSSProperties } from 'react';
import { Toaster as Sonner, toast, type ToasterProps } from 'sonner';

/** `toast.success('Project created')`, `toast.error(message)`: import `toast` from here, not from sonner. */
export { toast };

// Every toast is the same white card with a hairline; only the small icon carries the status colour.
const TOKENS = {
  '--normal-bg': 'var(--popover)',
  '--normal-text': 'var(--popover-foreground)',
  '--normal-border': 'var(--border)',
  '--border-radius': 'var(--radius-lg)',
} as CSSProperties; // custom properties are not in CSSProperties' keys

/** Mounted once in the root layout. Top-right, minimal: white, hairline, 14 px, one tight shadow. */
export const Toaster = (props: ToasterProps) => (
  <Sonner
    position="top-right"
    closeButton
    className="toaster group"
    style={TOKENS}
    icons={{
      success: <CircleCheckIcon className="size-4 text-success" />,
      info: <InfoIcon className="size-4 text-info" />,
      warning: <TriangleAlertIcon className="size-4 text-warning" />,
      error: <CircleAlertIcon className="size-4 text-destructive" />,
      loading: <Loader2Icon className="size-4 animate-spin text-muted-foreground" />,
    }}
    toastOptions={{ classNames: { toast: 'font-sans text-sm shadow-popover!', title: 'font-medium', description: 'text-caption text-muted-foreground!' } }}
    {...props}
  />
);
