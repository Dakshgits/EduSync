const { asyncHandler, ok } = require('../utils/helpers');
const authService = require('../services/authService');
const userModel = require('../models/userModel');
const { signToken, cookieOptions, COOKIE_NAME } = require('../middleware/auth');

const register = asyncHandler(async (req, res) => {
  const user = await authService.registerStudent(req.body);
  res.cookie(COOKIE_NAME, signToken(user), cookieOptions());
  ok(res, { user }, 'Account created', 201);
});

const login = asyncHandler(async (req, res) => {
  const user = await authService.login(req.body);
  res.cookie(COOKIE_NAME, signToken(user), cookieOptions());
  ok(res, { user }, 'Signed in');
});

const logout = (_req, res) => {
  const { maxAge, ...opts } = cookieOptions(); // eslint-disable-line no-unused-vars
  res.clearCookie(COOKIE_NAME, opts);
  ok(res, null, 'Signed out');
};

const me = (req, res) => ok(res, { user: req.user });

const updateProfile = asyncHandler(async (req, res) => ok(res, { user: await userModel.updateName(req.user.id, req.body.full_name) }, 'Profile updated'));

const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user.id, req.body);
  ok(res, null, 'Password changed');
});

module.exports = { register, login, logout, me, updateProfile, changePassword };
