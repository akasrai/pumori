'use client';

import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { reportError } from '@/lib/report-error';

import { fontSans } from './fonts/font';
import './globals.css';

interface GlobalErrorProps {
  error: unknown;
  retry: () => void;
}

/** Replaces the root layout when it fails, so it renders its own <html> and imports the theme itself. */
const GlobalError = ({ error, retry }: GlobalErrorProps) => {
  useEffect(() => {
    reportError(error, { source: 'global-error' });
  }, [error]);

  return (
    <html lang="en" className={fontSans.variable}>
      <body>
        <title>Something went wrong</title>
        <main aria-labelledby="global-error-title" className="flex min-h-svh items-center justify-center bg-background px-4 py-10">
          <div className="flex w-full max-w-[360px] flex-col items-center gap-4 rounded-lg border px-6 py-12 text-center">
            <div className="grid gap-1">
              <h1 id="global-error-title" className="text-sm font-semibold">Something went wrong</h1>
              <p role="alert" className="text-sm text-muted-foreground">The application failed to load. Please try again.</p>
            </div>
            <Button type="button" onClick={() => retry()}>Try again</Button>
          </div>
        </main>
      </body>
    </html>
  );
};

export default GlobalError;
