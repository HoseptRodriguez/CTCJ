import { HttpError } from '../../../../../shared/errors/httpError.js';

export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(
        new HttpError(
          400,
          'validation_error',
          result.error.errors[0]?.message ?? 'Invalid request body.',
        ),
      );
    }
    req.body = result.data;
    return next();
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return next(
        new HttpError(
          400,
          'validation_error',
          result.error.errors[0]?.message ?? 'Invalid query parameters.',
        ),
      );
    }
    req.query = result.data;
    return next();
  };
}
