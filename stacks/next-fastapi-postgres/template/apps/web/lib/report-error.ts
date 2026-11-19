export interface ErrorReportContext {
  /** Where it happened: 'server-request', 'error-boundary', 'global-error'. */
  source: string;
  /** Next's error digest: matches the server log line for a server-side error. */
  digest?: string;
  /** Route path without query string (it can carry tokens). */
  path?: string;
}

/**
 * Hook for an error-tracking service, called by instrumentation.ts (server) and the error
 * boundaries (browser). TODO: forward to Sentry (`Sentry.captureException`) or OpenTelemetry.
 * Never include request bodies, cookies, tokens or personal data, and never throw from here.
 */
export const reportError = (_error: unknown, _context: ErrorReportContext): void => {
  // Intentionally a no-op until a provider is chosen; Next already logs server errors.
};
