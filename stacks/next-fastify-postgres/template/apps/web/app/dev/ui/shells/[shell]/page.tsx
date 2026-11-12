import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ShellPreview } from '@/components/dev/shell-preview';
import { SHELL, type ShellKind } from '@/lib/app-constants';

export const metadata: Metadata = { title: 'Shell preview' };

interface ShellPreviewPageProps {
  params: Promise<{ shell: string }>;
}

const isShellKind = (value: string): value is ShellKind => Object.values(SHELL).some((kind) => kind === value);

/**
 * Dev-only full-page preview of one app shell (/dev/ui/shells/sidebar, /dev/ui/shells/topbar) with demo
 * content. The UI gallery frames it; e2e checks both shells here. A 404 in production.
 */
const ShellPreviewPage = async ({ params }: ShellPreviewPageProps) => {
  if (process.env.NODE_ENV === 'production') notFound();

  const { shell } = await params;

  if (!isShellKind(shell)) notFound();

  return <ShellPreview shell={shell} />;
};

export default ShellPreviewPage;
