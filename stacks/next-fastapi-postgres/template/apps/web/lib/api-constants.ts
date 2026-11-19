/** Every request to the API gives up after this long (browser and server side). */
export const REQUEST_TIMEOUT_MS = 15_000;

/** Client-side error codes (the API's own codes come from ErrorCode in @app/shared). */
export const CLIENT_ERROR = {
  NETWORK: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  HTTP: 'HTTP_ERROR',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
} as const;

export const CLIENT_ERROR_MESSAGES = {
  NETWORK: 'Could not reach the server',
  TIMEOUT: 'The server took too long to respond',
  INVALID_RESPONSE: 'Unexpected response from the server',
} as const;
