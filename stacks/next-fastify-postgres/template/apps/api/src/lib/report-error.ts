export interface ErrorContext {
  method?: string;
  /** Already redacted (see redactUrl): never pass raw URLs, bodies, tokens or personal data. */
  url?: string;
  requestId?: string;
}

/**
 * Hook for an error-tracking service; called by the API error handler for every 5xx.
 * TODO: send to Sentry (`Sentry.captureException(error, { extra: context })`) or record an
 * OpenTelemetry exception event. It must never throw and must not block the response for long.
 */
export const reportError = (_error: unknown, _context: ErrorContext = {}): void => {
  // Intentionally a no-op until a provider is chosen; the error is already in the server log.
};
