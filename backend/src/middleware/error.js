const ApiError = require('../utils/ApiError');
const env = require('../config/env');

const notFound = (req, _res, next) => next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, _req, res, _next) => {
  let status = err.status || 500;
  let code = typeof err.code === 'string' && err.status ? err.code : 'INTERNAL_ERROR';
  let message = err.message;

  // Translate common PostgreSQL errors
  if (err.code === '23505') { status = 409; code = 'CONFLICT'; message = 'That record already exists'; }
  else if (err.code === '23503') { status = 409; code = 'CONFLICT'; message = 'Operation blocked by related records'; }
  else if (err.code === '22P02' || err.code === '22007' || err.code === '22008') { status = 400; code = 'BAD_REQUEST'; message = 'Invalid input value'; }
  else if (err.type === 'entity.parse.failed') { status = 400; code = 'BAD_REQUEST'; message = 'Malformed JSON body'; }

  if (status >= 500) {
    console.error(err);
    if (env.isProd) message = 'Something went wrong on our side';
  }
  res.status(status).json({ success: false, error: { code, message, details: err.details } });
};

module.exports = { notFound, errorHandler };
