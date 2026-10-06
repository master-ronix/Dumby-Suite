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

export function toErrorResponse(err: unknown): { statusCode: number; body: ErrorResponseBody } {
  if (isDumbyError(err)) {
    return { statusCode: err.httpStatus, body: err.toJSON() };
  }
  return { statusCode: 500, body: INTERNAL_ERROR_BODY };
}
