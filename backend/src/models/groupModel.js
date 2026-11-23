const { pool } = require('../config/db');

const getMembership = async (userId, db = pool) =>
  (await db.query('SELECT group_id, member_role, joined_at FROM group_members WHERE user_id = $1', [userId])).rows[0] || null;

const getGroup = async (id, db = pool, lock = false) =>
  (await db.query(
    `SELECT g.id, g.group_name, g.created_by, g.created_at, u.full_name AS creator_name
     FROM groups g JOIN users u ON u.id = g.created_by WHERE g.id = $1 ${lock ? 'FOR UPDATE OF g' : ''}`, [id])).rows[0] || null;

const createGroup = async (name, userId, db = pool) =>
  (await db.query('INSERT INTO groups (group_name, created_by) VALUES ($1, $2) RETURNING id, group_name, created_by, created_at', [name, userId])).rows[0];

const addMember = async (groupId, userId, role, db = pool) =>
  (await db.query('INSERT INTO group_members (group_id, user_id, member_role) VALUES ($1, $2, $3) RETURNING *', [groupId, userId, role])).rows[0];

const removeMember = async (groupId, userId, db = pool) =>
  db.query('DELETE FROM group_members WHERE group_id = $1 AND user_id = $2', [groupId, userId]);

const setLeader = async (groupId, userId, db = pool) =>
  db.query("UPDATE group_members SET member_role = 'LEADER' WHERE group_id = $1 AND user_id = $2", [groupId, userId]);

const deleteGroup = async (groupId, db = pool) => db.query('DELETE FROM groups WHERE id = $1', [groupId]);

const listMembers = async (groupId, db = pool) =>
  (await db.query(
    `SELECT u.id, u.full_name, u.email, u.student_id, gm.member_role, gm.joined_at
     FROM group_members gm JOIN users u ON u.id = gm.user_id
     WHERE gm.group_id = $1 ORDER BY gm.member_role, gm.joined_at`, [groupId])).rows;

const countMembers = async (groupId, db = pool) =>
  Number((await db.query('SELECT COUNT(*) FROM group_members WHERE group_id = $1', [groupId])).rows[0].count);

const countPendingInvites = async (groupId, db = pool) =>
  Number((await db.query("SELECT COUNT(*) FROM group_invitations WHERE group_id = $1 AND status = 'PENDING'", [groupId])).rows[0].count);

const hasConfirmations = async (groupId, db = pool) =>
  (await db.query(
    `SELECT 1 FROM submission_confirmations sc JOIN submissions s ON s.id = sc.submission_id WHERE s.group_id = $1 LIMIT 1`, [groupId])).rowCount > 0;

const nextLeaderCandidate = async (groupId, excludeUserId, db = pool) =>
  (await db.query('SELECT user_id FROM group_members WHERE group_id = $1 AND user_id <> $2 ORDER BY joined_at LIMIT 1', [groupId, excludeUserId])).rows[0]?.user_id || null;

/** Admin overview of all groups with submission rollups. */
const listGroupsOverview = async (db = pool) =>
  (await db.query(
    `SELECT g.id, g.group_name, g.created_at,
            (SELECT u.full_name FROM group_members gm JOIN users u ON u.id = gm.user_id WHERE gm.group_id = g.id AND gm.member_role = 'LEADER') AS leader_name,
            (SELECT COUNT(*)::int FROM group_members gm WHERE gm.group_id = g.id) AS member_count,
            COUNT(sp.submission_id)::int AS assigned,
            COUNT(*) FILTER (WHERE sp.computed_status = 'SUBMITTED')::int AS submitted,
            COUNT(*) FILTER (WHERE sp.computed_status = 'PARTIAL')::int AS partial,
            COUNT(*) FILTER (WHERE sp.computed_status = 'PENDING')::int AS pending,
            COALESCE(ROUND(AVG(sp.percent)), 0)::int AS avg_progress
     FROM groups g LEFT JOIN submission_progress sp ON sp.group_id = g.id
     GROUP BY g.id ORDER BY g.group_name`)).rows;

/* ---------- invitations ---------- */
const createInvitation = async (groupId, invitedUserId, invitedBy, db = pool) =>
  (await db.query('INSERT INTO group_invitations (group_id, invited_user_id, invited_by) VALUES ($1, $2, $3) RETURNING *', [groupId, invitedUserId, invitedBy])).rows[0];

const listGroupInvitations = async (groupId, db = pool) =>
  (await db.query(
    `SELECT i.id, i.status, i.created_at, i.responded_at, u.id AS user_id, u.full_name, u.email, u.student_id
     FROM group_invitations i JOIN users u ON u.id = i.invited_user_id
     WHERE i.group_id = $1 ORDER BY i.created_at DESC`, [groupId])).rows;

const listUserInvitations = async (userId, db = pool) =>
  (await db.query(
    `SELECT i.id, i.status, i.created_at, i.responded_at, g.id AS group_id, g.group_name,
            inv.full_name AS invited_by_name,
            (SELECT COUNT(*)::int FROM group_members gm WHERE gm.group_id = g.id) AS member_count
     FROM group_invitations i
     JOIN groups g ON g.id = i.group_id JOIN users inv ON inv.id = i.invited_by
     WHERE i.invited_user_id = $1 ORDER BY (i.status = 'PENDING') DESC, i.created_at DESC`, [userId])).rows;

const getInvitation = async (id, db = pool, lock = false) =>
  (await db.query(`SELECT * FROM group_invitations WHERE id = $1 ${lock ? 'FOR UPDATE' : ''}`, [id])).rows[0] || null;

const setInvitationStatus = async (id, status, db = pool) =>
  (await db.query('UPDATE group_invitations SET status = $2, responded_at = now() WHERE id = $1 RETURNING *', [id, status])).rows[0];

const deleteInvitation = async (id, db = pool) => db.query('DELETE FROM group_invitations WHERE id = $1', [id]);

const hasPendingInvite = async (groupId, userId, db = pool) =>
  (await db.query("SELECT 1 FROM group_invitations WHERE group_id = $1 AND invited_user_id = $2 AND status = 'PENDING'", [groupId, userId])).rowCount > 0;

module.exports = {
  getMembership, getGroup, createGroup, addMember, removeMember, setLeader, deleteGroup, listMembers, countMembers,
  countPendingInvites, hasConfirmations, nextLeaderCandidate, listGroupsOverview,
  createInvitation, listGroupInvitations, listUserInvitations, getInvitation, setInvitationStatus, deleteInvitation, hasPendingInvite,
};
