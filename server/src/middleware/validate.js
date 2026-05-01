import { ApiError } from '../utils/ApiError.js';

export const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    console.error('Validation failed for', source, ':', JSON.stringify(result.error.flatten(), null, 2));
    return next(ApiError.unprocessable('Validation failed', result.error.flatten()));
  }
  req[source] = result.data;
  next();
};
