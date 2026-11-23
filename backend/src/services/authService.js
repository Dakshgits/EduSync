const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');
const ApiError = require('../utils/ApiError');

const ROUNDS = 12;
const hash = (pw) => bcrypt.hash(pw, ROUNDS);

async function registerStudent({ full_name, email, student_id, password }) {
  const clashes = await userModel.emailOrStudentIdTaken(email, student_id);
  const details = {};
  if (clashes.some((r) => r.email_taken)) details.email = 'This email is already registered';
  if (clashes.some((r) => r.id_taken)) details.student_id = 'This student ID is already registered';
  if (Object.keys(details).length) throw new ApiError(409, 'Account already exists', 'CONFLICT', details);
  // role is never taken from the request: public registration always creates a STUDENT
  return userModel.createStudent({ full_name: full_name.trim(), email, student_id, password_hash: await hash(password) });
}

async function login({ email, password }) {
  const row = await userModel.findAuthByEmail(email);
  // Always run a compare to keep timing similar for unknown emails
  const ok = await bcrypt.compare(password, row ? row.password_hash : '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv');
  if (!row || !ok) throw ApiError.unauthorized('Incorrect email or password');
  const { password_hash, ...user } = row; // eslint-disable-line no-unused-vars
  return user;
}

async function changePassword(userId, { current_password, new_password }) {
  const current = await userModel.getPasswordHash(userId);
  if (!(await bcrypt.compare(current_password, current))) throw new ApiError(422, 'Current password is incorrect', 'VALIDATION_ERROR', { current_password: 'Current password is incorrect' });
  await userModel.updatePassword(userId, await hash(new_password));
}

module.exports = { registerStudent, login, changePassword, hash };
