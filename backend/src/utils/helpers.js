const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const ok = (res, data, message, status = 200) => res.status(status).json({ success: true, data, message });
const toInt = (v) => { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : null; };
module.exports = { asyncHandler, ok, toInt };
