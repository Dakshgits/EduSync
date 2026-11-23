const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

module.exports = (req, _res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const details = {};
  result.array().forEach((e) => { if (!details[e.path]) details[e.path] = e.msg; });
  next(new ApiError(422, 'Please correct the highlighted fields', 'VALIDATION_ERROR', details));
};
