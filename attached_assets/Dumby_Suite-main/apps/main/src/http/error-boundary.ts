import { isDumbyError } from '../errors/taxonomy.js';

export interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
    retryable: boolean;
    metadata: Record<string, unknown>;
  };
}

const INTERNAL_ERROR_BODY: ErrorResponseBody = {
  error: {
    code: 'DUMBY_INTERNAL_ERROR',
    message: 'An unexpected error occurred.',
    retryable: false,
    metadata: {},
  },
};

/**
 * Root error boundary (Cluster: Keepy). Every HTTP route funnels its
 * caught error through this. A DumbyError renders its own code/status/
 * metadata; anything else (a genuine bug, a third-party throw) is
 * flattened to a single generic 500 body so stack traces and internal
 * messages never reach a client — full detail still goes to the logger,
 * which is the caller's job, not this function's.
 */
export function toErrorResponse(err: unknown): { statusCode: number; body: ErrorResponseBody } {
  if (isDumbyError(err)) {
    return { statusCode: err.httpStatus, body: err.toJSON() };
  }
  return { statusCode: 500, body: INTERNAL_ERROR_BODY };
}
