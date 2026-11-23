const { pool } = require('../config/db');

const PUBLIC = 'id, full_name, email, student_id, role, created_at';

const findById = async (id, db = pool) =>
  (await db.query(`SELECT ${PUBLIC} FROM users WHERE id = $1`, [id])).rows[0] || null;

const findAuthByEmail = async (email, db = pool) =>
  (await db.query('SELECT id, full_name, email, student_id, role, password_hash, created_at FROM users WHERE lower(email) = lower($1)', [email])).rows[0] || null;

/** Find a STUDENT by email or student ID (used for invitations). */
const findStudentByIdentifier = async (identifier, db = pool) =>
  (await db.query(
    `SELECT ${PUBLIC} FROM users
     WHERE role = 'STUDENT' AND (lower(email) = lower($1) OR upper(student_id) = upper($1))`,
    [identifier.trim()]
  )).rows[0] || null;

const createStudent = async ({ full_name, email, student_id, password_hash }, db = pool) =>
  (await db.query(
    `INSERT INTO users (full_name, email, student_id, password_hash, role)
     VALUES ($1, lower($2), upper($3), $4, 'STUDENT') RETURNING ${PUBLIC}`,
    [full_name, email, student_id, password_hash]
  )).rows[0];

const createAdmin = async ({ full_name, email, password_hash }, db = pool) =>
  (await db.query(
    `INSERT INTO users (full_name, email, password_hash, role) VALUES ($1, lower($2), $3, 'ADMIN') RETURNING ${PUBLIC}`,
    [full_name, email, password_hash]
  )).rows[0];

const emailOrStudentIdTaken = async (email, studentId, db = pool) =>
  (await db.query(
    'SELECT lower(email) = lower($1) AS email_taken, upper(student_id) = upper($2) AS id_taken FROM users WHERE lower(email) = lower($1) OR upper(student_id) = upper($2)',
    [email, studentId]
  )).rows;

const updateName = async (id, fullName, db = pool) =>
  (await db.query(`UPDATE users SET full_name = $2 WHERE id = $1 RETURNING ${PUBLIC}`, [id, fullName])).rows[0];

const getPasswordHash = async (id, db = pool) =>
  (await db.query('SELECT password_hash FROM users WHERE id = $1', [id])).rows[0]?.password_hash;

const updatePassword = async (id, hash, db = pool) =>
  db.query('UPDATE users SET password_hash = $2 WHERE id = $1', [id, hash]);

module.exports = { findById, findAuthByEmail, findStudentByIdentifier, createStudent, createAdmin, emailOrStudentIdTaken, updateName, getPasswordHash, updatePassword };
