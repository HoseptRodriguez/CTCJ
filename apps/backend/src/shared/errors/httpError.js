/**
 * Thin HTTP-facing error used by the infrastructure/http layer only.
 * Domain/application errors are translated into this shape at the boundary,
 * mirroring v7's GlobalExceptionHandler (RFC 7807-style problem details).
 */
export class HttpError extends Error {
  constructor(status, code, message, { expose = true } = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.expose = expose;
  }
}

export function toProblemDetail(err) {
  const status = err instanceof HttpError ? err.status : 500;
  const code = err instanceof HttpError ? err.code : 'internal_error';
  const message =
    err instanceof HttpError && err.expose ? err.message : 'An unexpected error occurred.';

  return {
    status,
    body: {
      type: `https://ctcj.co/errors/${code}`,
      title: message,
      status,
      code,
    },
  };
}
