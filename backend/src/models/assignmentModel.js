const { pool } = require('../config/db');

const create = async ({ title, description, due_date, onedrive_link, target_type }, createdBy, db = pool) =>
  (await db.query(
    `INSERT INTO assignments (title, description, due_date, onedrive_link, created_by, target_type)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [title, description || '', due_date, onedrive_link, createdBy, target_type])).rows[0];

const update = async (id, { title, description, due_date, onedrive_link, target_type }, db = pool) =>
  (await db.query(
    `UPDATE assignments SET title = $2, description = $3, due_date = $4, onedrive_link = $5, target_type = $6
     WHERE id = $1 RETURNING *`,
    [id, title, description || '', due_date, onedrive_link, target_type])).rows[0];

const remove = async (id, db = pool) => db.query('DELETE FROM assignments WHERE id = $1', [id]);

const findRaw = async (id, db = pool, lock = false) =>
  (await db.query(`SELECT * FROM assignments WHERE id = $1 ${lock ? 'FOR UPDATE' : ''}`, [id])).rows[0] || null;

const targetGroupIds = async (id, db = pool) =>
  (await db.query('SELECT group_id FROM assignment_groups WHERE assignment_id = $1 ORDER BY group_id', [id])).rows.map((r) => r.group_id);

const setTargets = async (id, groupIds, db = pool) => {
  await db.query('DELETE FROM assignment_groups WHERE assignment_id = $1 AND NOT (group_id = ANY($2::int[]))', [id, groupIds]);
  if (groupIds.length) {
    await db.query(
      'INSERT INTO assignment_groups (assignment_id, group_id) SELECT $1, UNNEST($2::int[]) ON CONFLICT (assignment_id, group_id) DO NOTHING', [id, groupIds]);
  }
};

const existingGroupIds = async (ids, db = pool) =>
  (await db.query('SELECT id FROM groups WHERE id = ANY($1::int[])', [ids])).rows.map((r) => r.id);

/** Submissions (with confirmations) that would be dropped if these groups are no longer targeted. */
const groupsWithConfirmationsOutside = async (assignmentId, keepGroupIds, db = pool) =>
  (await db.query(
    `SELECT DISTINCT g.group_name FROM submissions s
       JOIN groups g ON g.id = s.group_id
       JOIN submission_confirmations sc ON sc.submission_id = s.id
     WHERE s.assignment_id = $1 AND NOT (s.group_id = ANY($2::int[]))`, [assignmentId, keepGroupIds])).rows.map((r) => r.group_name);

const deleteSubmissionsOutside = async (assignmentId, keepGroupIds, db = pool) =>
  db.query('DELETE FROM submissions WHERE assignment_id = $1 AND NOT (group_id = ANY($2::int[]))', [assignmentId, keepGroupIds]);

const countRelated = async (id, db = pool) =>
  (await db.query(
    `SELECT (SELECT COUNT(*)::int FROM submissions WHERE assignment_id = $1) AS submissions,
            (SELECT COUNT(*)::int FROM submission_confirmations sc JOIN submissions s ON s.id = sc.submission_id WHERE s.assignment_id = $1) AS confirmations`, [id])).rows[0];

/** Admin list with per-assignment rollups. */
const listAdmin = async (id = null, db = pool) =>
  (await db.query(
    `SELECT a.id, a.title, a.description, a.due_date, a.onedrive_link, a.target_type, a.created_at, a.updated_at, a.created_by,
            u.full_name AS professor_name,
            COUNT(sp.submission_id)::int AS total_groups,
            COUNT(*) FILTER (WHERE sp.computed_status = 'SUBMITTED')::int AS submitted_groups,
            COUNT(*) FILTER (WHERE sp.computed_status = 'PARTIAL')::int AS partial_groups,
            COUNT(*) FILTER (WHERE sp.computed_status = 'PENDING')::int AS pending_groups,
            COALESCE(SUM(sp.confirmed_members), 0)::int AS confirmed_members,
            COALESCE(SUM(sp.total_members), 0)::int AS total_members
     FROM assignments a JOIN users u ON u.id = a.created_by
     LEFT JOIN submission_progress sp ON sp.assignment_id = a.id
     ${id ? 'WHERE a.id = $1' : ''}
     GROUP BY a.id, u.full_name ORDER BY a.due_date`, id ? [id] : [])).rows;

/** Student view: only assignments for ALL or the student's group; includes the group's progress. */
const listForStudent = async (userId, id = null, db = pool) =>
  (await db.query(
    `SELECT a.id, a.title, a.description, a.due_date, a.onedrive_link, a.target_type, a.created_at,
            u.full_name AS professor_name,
            g.id AS group_id, g.group_name,
            sp.submission_id, COALESCE(sp.total_members, 0) AS total_members, COALESCE(sp.confirmed_members, 0) AS confirmed_members,
            COALESCE(sp.percent, 0) AS percent,
            COALESCE(sp.computed_status, 'PENDING') AS status,
            (a.due_date < now() AND COALESCE(sp.computed_status, 'PENDING') <> 'SUBMITTED') AS is_overdue,
            (g.id IS NOT NULL) AS has_group,
            EXISTS (SELECT 1 FROM submission_confirmations sc WHERE sc.submission_id = sp.submission_id AND sc.student_id = $1) AS my_confirmed
     FROM assignments a
     JOIN users u ON u.id = a.created_by
     LEFT JOIN group_members gm ON gm.user_id = $1
     LEFT JOIN groups g ON g.id = gm.group_id
     LEFT JOIN submission_progress sp ON sp.assignment_id = a.id AND sp.group_id = gm.group_id
     WHERE (a.target_type = 'ALL'
            OR EXISTS (SELECT 1 FROM assignment_groups ag WHERE ag.assignment_id = a.id AND ag.group_id = gm.group_id))
       ${id ? 'AND a.id = $2' : ''}
     ORDER BY a.due_date`, id ? [userId, id] : [userId])).rows;

module.exports = { create, update, remove, findRaw, targetGroupIds, setTargets, existingGroupIds, groupsWithConfirmationsOutside, deleteSubmissionsOutside, countRelated, listAdmin, listForStudent };
