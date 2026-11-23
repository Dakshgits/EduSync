const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const userModel = require('../models/userModel');

const COOKIE_NAME = 'edusync_token';

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.cookie.secure,
    sameSite: env.cookie.sameSite,
    maxAge: env.jwtExpiresHours * 3600 * 1000,
    path: '/',
  };
}

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, { expiresIn: `${env.jwtExpiresHours}h` });
}

async function authenticate(req, _res, next) {
  try {
    let token = req.cookies && req.cookies[COOKIE_NAME];
    const header = req.headers.authorization;
    if (!token && header && header.startsWith('Bearer ')) token = header.slice(7);
    if (!token) throw ApiError.unauthorized();
    let payload;
    try {
      payload = jwt.verify(token, env.jwtSecret);
    } catch (e) {
      throw ApiError.unauthorized(e.name === 'TokenExpiredError' ? 'Session expired. Please sign in again.' : 'Invalid session. Please sign in again.');
    }
    const user = await userModel.findById(payload.sub);
    if (!user) throw ApiError.unauthorized('Account no longer exists');
    req.user = user; // role comes from the DB, not from the token
    next();
  } catch (err) {
    next(err);
  }
}

const authorize = (...roles) => (req, _res, next) =>
  roles.includes(req.user.role) ? next() : next(ApiError.forbidden(`Requires role: ${roles.join(' or ')}`));

module.exports = { authenticate, authorize, signToken, cookieOptions, COOKIE_NAME };
