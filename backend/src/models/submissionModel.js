const { pool } = require('../config/db');

/** Create missing submission rows (one per assignment/group). Idempotent. */
const syncForAssignment = async (assignmentId, db = pool) =>
  db.query(
    `INSERT INTO submissions (assignment_id, group_id)
     SELECT a.id, g.id FROM assignments a CROSS JOIN groups g WHERE a.id = $1 AND a.target_type = 'ALL'
     UNION
     SELECT ag.assignment_id, ag.group_id FROM assignment_groups ag
       JOIN assignments a ON a.id = ag.assignment_id WHERE a.id = $1 AND a.target_type = 'SELECTED_GROUPS'
     ON CONFLICT (assignment_id, group_id) DO NOTHING`, [assignmentId]);

const syncForGroup = async (groupId, db = pool) =>
  db.query(
    `INSERT INTO submissions (assignment_id, group_id)
     SELECT id, $1 FROM assignments WHERE target_type = 'ALL'
     ON CONFLICT (assignment_id, group_id) DO NOTHING`, [groupId]);

/** Persist the derived status (view = source of truth) for a scope. */
const refreshStatus = async ({ submissionId, groupId, assignmentId, all }, db = pool) => {
  const where = submissionId ? 's.id = $1' : groupId ? 's.group_id = $1' : assignmentId ? 's.assignment_id = $1' : 'TRUE';
  const params = submissionId || groupId || assignmentId ? [submissionId || groupId || assignmentId] : [];
  return db.query(
    `UPDATE submissions s SET status = p.computed_status
     FROM submission_progress p WHERE p.submission_id = s.id AND s.status IS DISTINCT FROM p.computed_status AND ${all ? 'TRUE' : where}`, all ? [] : params);
};

const BASE = `
  SELECT p.submission_id AS id, p.assignment_id, p.group_id, p.total_members, p.confirmed_members, p.percent,
         p.computed_status AS status,
         a.title AS assignment_title, a.description, a.due_date, a.onedrive_link, a.created_at AS assignment_created_at,
         g.group_name,
         (a.due_date < now() AND p.computed_status <> 'SUBMITTED') AS is_overdue,
         (SELECT MAX(sc.confirmed_at) FROM submission_confirmations sc WHERE sc.submission_id = p.submission_id) AS last_confirmed_at
  FROM submission_progress p
  JOIN assignments a ON a.id = p.assignment_id
  JOIN groups g ON g.id = p.group_id`;

const listAdmin = async ({ assignmentId, groupId, status } = {}, db = pool) => {
  const where = []; const params = [];
  if (assignmentId) { params.push(assignmentId); where.push(`p.assignment_id = $${params.length}`); }
  if (groupId) { params.push(groupId); where.push(`p.group_id = $${params.length}`); }
  if (status) { params.push(status); where.push(`p.computed_status = $${params.length}`); }
  return (await db.query(`${BASE} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY a.due_date, g.group_name`, params)).rows;
};

const listForGroup = async (groupId, db = pool) =>
  (await db.query(`${BASE} WHERE p.group_id = $1 ORDER BY a.due_date`, [groupId])).rows;

const getById = async (id, db = pool) =>
  (await db.query(`${BASE} WHERE p.submission_id = $1`, [id])).rows[0] || null;

const lockById = async (id, db) =>
  (await db.query('SELECT id, group_id, assignment_id FROM submissions WHERE id = $1 FOR UPDATE', [id])).rows[0] || null;

/** Every current member of the group with their confirmation (if any) for this submission. */
const memberConfirmations = async (submissionId, groupId, db = pool) =>
  (await db.query(
    `SELECT u.id, u.full_name, u.email, u.student_id, gm.member_role, sc.confirmed_at,
            (sc.confirmed_at IS NOT NULL) AS confirmed,
            (sc.confirmed_at IS NOT NULL AND sc.confirmed_at > a.due_date) AS late
     FROM group_members gm
     JOIN users u ON u.id = gm.user_id
     JOIN submissions s ON s.id = $1
     JOIN assignments a ON a.id = s.assignment_id
     LEFT JOIN submission_confirmations sc ON sc.student_id = u.id AND sc.submission_id = $1
     WHERE gm.group_id = $2 ORDER BY gm.member_role, u.full_name`, [submissionId, groupId])).rows;

const insertConfirmation = async (submissionId, studentId, db) =>
  (await db.query(
    `INSERT INTO submission_confirmations (submission_id, student_id) VALUES ($1, $2)
     ON CONFLICT (submission_id, student_id) DO NOTHING RETURNING *`, [submissionId, studentId])).rows[0] || null;

module.exports = { syncForAssignment, syncForGroup, refreshStatus, listAdmin, listForGroup, getById, lockById, memberConfirmations, insertConfirmation };
