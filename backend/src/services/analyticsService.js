const { query } = require('../config/db');

async function admin() {
  const [totals, statuses, recent, upcoming] = await Promise.all([
    query(`SELECT (SELECT COUNT(*)::int FROM users WHERE role = 'STUDENT') AS students,
                  (SELECT COUNT(*)::int FROM groups) AS groups,
                  (SELECT COUNT(*)::int FROM assignments) AS assignments,
                  (SELECT COUNT(*)::int FROM group_members) AS grouped_students`),
    query(`SELECT COUNT(*)::int AS total,
                  COUNT(*) FILTER (WHERE computed_status = 'SUBMITTED')::int AS submitted,
                  COUNT(*) FILTER (WHERE computed_status = 'PARTIAL')::int AS partial,
                  COUNT(*) FILTER (WHERE computed_status = 'PENDING')::int AS pending,
                  COALESCE(SUM(confirmed_members), 0)::int AS confirmed_members,
                  COALESCE(SUM(total_members), 0)::int AS total_members
           FROM submission_progress`),
    query(`SELECT sc.id, sc.confirmed_at, u.full_name AS student_name, g.group_name, a.title AS assignment_title, a.id AS assignment_id,
                  (sc.confirmed_at > a.due_date) AS late
           FROM submission_confirmations sc
           JOIN users u ON u.id = sc.student_id JOIN submissions s ON s.id = sc.submission_id
           JOIN groups g ON g.id = s.group_id JOIN assignments a ON a.id = s.assignment_id
           ORDER BY sc.confirmed_at DESC LIMIT 8`),
    query(`SELECT a.id, a.title, a.due_date,
                  COUNT(sp.submission_id)::int AS total_groups,
                  COUNT(*) FILTER (WHERE sp.computed_status = 'SUBMITTED')::int AS submitted_groups
           FROM assignments a LEFT JOIN submission_progress sp ON sp.assignment_id = a.id
           WHERE a.due_date >= now() GROUP BY a.id ORDER BY a.due_date LIMIT 5`),
  ]);
  const s = statuses.rows[0];
  return {
    totals: totals.rows[0],
    submissions: {
      ...s,
      completion_percent: s.total ? Math.round((100 * s.submitted) / s.total) : 0,
      member_confirmation_percent: s.total_members ? Math.round((100 * s.confirmed_members) / s.total_members) : 0,
    },
    recent_activity: recent.rows,
    upcoming_deadlines: upcoming.rows,
  };
}

async function assignments() {
  return (await query(
    `SELECT a.id, a.title, a.due_date, a.target_type,
            COUNT(sp.submission_id)::int AS total,
            COUNT(*) FILTER (WHERE sp.computed_status = 'SUBMITTED')::int AS submitted,
            COUNT(*) FILTER (WHERE sp.computed_status = 'PARTIAL')::int AS partial,
            COUNT(*) FILTER (WHERE sp.computed_status = 'PENDING')::int AS pending,
            CASE WHEN COUNT(sp.submission_id) = 0 THEN 0
                 ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE sp.computed_status = 'SUBMITTED') / COUNT(sp.submission_id)) END::int AS completion_percent,
            COALESCE(SUM(sp.confirmed_members), 0)::int AS confirmed_members,
            COALESCE(SUM(sp.total_members), 0)::int AS total_members
     FROM assignments a LEFT JOIN submission_progress sp ON sp.assignment_id = a.id
     GROUP BY a.id ORDER BY a.due_date`)).rows;
}

async function groups() {
  return (await query(
    `SELECT g.id, g.group_name,
            (SELECT COUNT(*)::int FROM group_members gm WHERE gm.group_id = g.id) AS member_count,
            COUNT(sp.submission_id)::int AS assigned,
            COUNT(*) FILTER (WHERE sp.computed_status = 'SUBMITTED')::int AS submitted,
            COUNT(*) FILTER (WHERE sp.computed_status = 'PARTIAL')::int AS partial,
            COUNT(*) FILTER (WHERE sp.computed_status = 'PENDING')::int AS pending,
            COALESCE(ROUND(AVG(sp.percent)), 0)::int AS avg_progress
     FROM groups g LEFT JOIN submission_progress sp ON sp.group_id = g.id
     GROUP BY g.id ORDER BY g.group_name`)).rows;
}

/** Student dashboard numbers (own group only). */
async function student(userId) {
  const r = (await query(
    `SELECT gm.group_id, g.group_name,
            COUNT(sp.submission_id)::int AS assigned,
            COUNT(*) FILTER (WHERE sp.computed_status = 'SUBMITTED')::int AS group_submitted,
            COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM submission_confirmations sc WHERE sc.submission_id = sp.submission_id AND sc.student_id = $1))::int AS my_confirmed,
            COALESCE(ROUND(AVG(sp.percent)), 0)::int AS group_completion
     FROM group_members gm JOIN groups g ON g.id = gm.group_id
     LEFT JOIN submission_progress sp ON sp.group_id = gm.group_id
     WHERE gm.user_id = $1 GROUP BY gm.group_id, g.group_name`, [userId])).rows[0];
  const all = (await query(
    `SELECT COUNT(*)::int AS total FROM assignments a
     LEFT JOIN group_members gm ON gm.user_id = $1
     WHERE a.target_type = 'ALL' OR EXISTS (SELECT 1 FROM assignment_groups ag WHERE ag.assignment_id = a.id AND ag.group_id = gm.group_id)`, [userId])).rows[0];
  return { has_group: !!r, group_name: r?.group_name || null, total_assigned: all.total,
    submitted: r?.group_submitted || 0, my_confirmed: r?.my_confirmed || 0,
    pending: Math.max(0, all.total - (r?.group_submitted || 0)), group_completion: r?.group_completion || 0 };
}

async function students() {
  return (await query(
    `SELECT u.id, u.full_name, u.email, u.student_id, g.id AS group_id, g.group_name, gm.member_role,
            (SELECT COUNT(*)::int FROM submissions s WHERE s.group_id = gm.group_id) AS assigned,
            (SELECT COUNT(*)::int FROM submission_confirmations sc JOIN submissions s ON s.id = sc.submission_id
              WHERE sc.student_id = u.id AND s.group_id = gm.group_id) AS confirmed,
            (SELECT MAX(sc.confirmed_at) FROM submission_confirmations sc WHERE sc.student_id = u.id) AS last_confirmed_at
     FROM users u LEFT JOIN group_members gm ON gm.user_id = u.id LEFT JOIN groups g ON g.id = gm.group_id
     WHERE u.role = 'STUDENT' ORDER BY u.full_name`)).rows;
}

module.exports = { admin, assignments, groups, student, students };
