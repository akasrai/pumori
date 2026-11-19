import type { Instrumentation } from 'next';

import { reportError } from './lib/report-error';

const digestOf = (err: unknown): string | undefined => {
  return typeof err === 'object' && err !== null && 'digest' in err ? String(err.digest) : undefined;
};

/** Called by Next for every uncaught server error (rendering, route handlers, server actions, proxy). */
export const onRequestError: Instrumentation.onRequestError = (err, request) => {
  reportError(err, { source: 'server-request', digest: digestOf(err), path: request.path.split('?')[0] });
};
