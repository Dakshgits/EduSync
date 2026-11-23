class ApiError extends Error {
  constructor(status, message, code = 'ERROR', details = undefined) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
  static badRequest(m, d) { return new ApiError(400, m, 'BAD_REQUEST', d); }
  static unauthorized(m = 'Authentication required') { return new ApiError(401, m, 'UNAUTHORIZED'); }
  static forbidden(m = 'You do not have permission to do this') { return new ApiError(403, m, 'FORBIDDEN'); }
  static notFound(m = 'Resource not found') { return new ApiError(404, m, 'NOT_FOUND'); }
  static conflict(m) { return new ApiError(409, m, 'CONFLICT'); }
}
module.exports = ApiError;
