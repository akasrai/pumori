'use client';

import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { reportError } from '@/lib/report-error';

interface ErrorPageProps {
  error: unknown;
  retry: () => void;
}

const digestOf = (error: unknown): string | undefined => {
  return error instanceof Error && 'digest' in error ? String(error.digest) : undefined;
};

/** Error boundary for every route segment below the root layout. Shows no error details. */
const ErrorPage = ({ error, retry }: ErrorPageProps) => {
  useEffect(() => {
    reportError(error, { source: 'error-boundary', digest: digestOf(error) });
  }, [error]);

  return (
    <main aria-labelledby="error-title" className="flex min-h-svh items-center justify-center bg-background px-4 py-10">
      <div className="flex w-full max-w-[360px] flex-col items-center gap-4 rounded-lg border px-6 py-12 text-center">
        <div className="grid gap-1">
          <h1 id="error-title" className="text-sm font-semibold">Something went wrong</h1>
          <p role="alert" className="text-sm text-muted-foreground">We could not load this page. Please try again.</p>
        </div>
        <Button type="button" onClick={() => retry()}>Try again</Button>
      </div>
    </main>
  );
};

export default ErrorPage;
