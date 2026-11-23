/* Demo data. Every OneDrive link below is a clearly labelled PLACEHOLDER – no uploads exist. */
const env = require('../config/env');
const { pool, withTransaction } = require('../config/db');
const { hash } = require('../services/authService');
const submissionModel = require('../models/submissionModel');

const STUDENTS = [
  ['Aarav Sharma', 'aarav.sharma', 'S2024001'], ['Diya Patel', 'diya.patel', 'S2024002'],
  ['Rohan Mehta', 'rohan.mehta', 'S2024003'], ['Ananya Iyer', 'ananya.iyer', 'S2024004'],
  ['Vihaan Gupta', 'vihaan.gupta', 'S2024005'], ['Ishita Rao', 'ishita.rao', 'S2024006'],
  ['Kabir Singh', 'kabir.singh', 'S2024007'], ['Meera Nair', 'meera.nair', 'S2024008'],
  ['Arjun Reddy', 'arjun.reddy', 'S2024009'], ['Sneha Kulkarni', 'sneha.kulkarni', 'S2024010'],
  ['Rahul Verma', 'rahul.verma', 'S2024011'], ['Priya Desai', 'priya.desai', 'S2024012'],
  ['Neha Joshi', 'neha.joshi', 'S2024013'],
];
// [group name, leader index, member indexes]
const GROUPS = [['Alpha Squad', 0, [1, 2, 3]], ['Beta Builders', 4, [5, 6]], ['Gamma Coders', 7, [8, 9]], ['Delta Team', 10, [11]]];

const day = (n) => new Date(Date.now() + n * 864e5);
const link = (n) => `https://onedrive.live.com/?id=DEMO-PLACEHOLDER-${n}&note=sample-link-no-real-upload`;

const ASSIGNMENTS = [
  { title: 'Database Design Case Study', description: 'Design a normalised schema for a library system and justify each table. Upload your ER diagram and SQL file to the OneDrive folder.', due: day(10), created: day(-6), target: 'ALL' },
  { title: 'REST API Mini Project', description: 'Build a small REST API with authentication. Upload the zipped source and a short README.', due: day(5), created: day(-4), target: 'SELECTED_GROUPS', groups: [0, 1] },
  { title: 'Algorithms Problem Set', description: 'Solve the 8 graded problems on sorting, graphs and dynamic programming.', due: day(-3), created: day(-14), target: 'ALL' },
  { title: 'UI/UX Wireframe Review', description: 'Submit wireframes for a mobile banking app and a one-page design rationale.', due: day(14), created: day(-2), target: 'SELECTED_GROUPS', groups: [2, 3] },
  { title: 'Research Reading Summary', description: 'Read the assigned paper and submit a 2-page summary with your group’s critique.', due: day(21), created: day(-1), target: 'ALL' },
];
// [assignment index, group index, [[member index, hours ago], ...]]
const CONFIRMATIONS = [
  [0, 0, [[0, 50], [1, 48], [2, 30], [3, 20]]], [0, 1, [[4, 26], [5, 12]]],
  [1, 0, [[0, 9], [1, 6], [2, 3]]],
  [2, 0, [[0, 120], [1, 110], [2, 100], [3, 96]]], [2, 1, [[4, 90], [5, 88], [6, 80]]], [2, 2, [[7, 30]]],
  [3, 2, [[7, 20], [8, 15], [9, 10]]], [3, 3, [[10, 5]]],
];

async function seed({ reset }) {
  if (!env.admin.password || !env.demoPassword) throw new Error('Set ADMIN_PASSWORD and DEMO_STUDENT_PASSWORD in your .env before seeding');
  const existing = Number((await pool.query('SELECT COUNT(*) FROM users')).rows[0].count);
  if (existing > 0 && !reset) return { skipped: true };

  const [adminHash, studentHash] = [await hash(env.admin.password), await hash(env.demoPassword)];
  await withTransaction(async (c) => {
    await c.query('TRUNCATE submission_confirmations, submissions, assignment_groups, assignments, group_invitations, group_members, groups, users RESTART IDENTITY CASCADE');
    const adminId = (await c.query("INSERT INTO users (full_name, email, password_hash, role) VALUES ($1, lower($2), $3, 'ADMIN') RETURNING id", [env.admin.name, env.admin.email, adminHash])).rows[0].id;

    const uid = [];
    for (const [name, local, sid] of STUDENTS) {
      uid.push((await c.query("INSERT INTO users (full_name, email, student_id, password_hash, role) VALUES ($1, $2, $3, $4, 'STUDENT') RETURNING id",
        [name, `${local}@student.edusync.demo`, sid, studentHash])).rows[0].id);
    }
    const gid = [];
    for (const [name, leader, members] of GROUPS) {
      const g = (await c.query('INSERT INTO groups (group_name, created_by) VALUES ($1, $2) RETURNING id', [name, uid[leader]])).rows[0].id;
      gid.push(g);
      await c.query("INSERT INTO group_members (group_id, user_id, member_role) VALUES ($1, $2, 'LEADER')", [g, uid[leader]]);
      for (const m of members) await c.query("INSERT INTO group_members (group_id, user_id, member_role) VALUES ($1, $2, 'MEMBER')", [g, uid[m]]);
    }
    // Neha (index 12) has no group: one pending invite from Delta, one earlier rejected invite from Beta
    await c.query("INSERT INTO group_invitations (group_id, invited_user_id, invited_by, status) VALUES ($1, $2, $3, 'PENDING')", [gid[3], uid[12], uid[10]]);
    await c.query("INSERT INTO group_invitations (group_id, invited_user_id, invited_by, status, responded_at) VALUES ($1, $2, $3, 'REJECTED', now() - interval '2 days')", [gid[1], uid[12], uid[4]]);

    const aid = [];
    for (const [i, a] of ASSIGNMENTS.entries()) {
      const id = (await c.query(
        'INSERT INTO assignments (title, description, due_date, onedrive_link, created_by, target_type, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
        [a.title, a.description, a.due, link(i + 1), adminId, a.target, a.created])).rows[0].id;
      aid.push(id);
      for (const g of a.groups || []) await c.query('INSERT INTO assignment_groups (assignment_id, group_id) VALUES ($1, $2)', [id, gid[g]]);
      await submissionModel.syncForAssignment(id, c);
    }
    for (const [a, g, list] of CONFIRMATIONS) {
      for (const [m, hours] of list) {
        await c.query(
          `INSERT INTO submission_confirmations (submission_id, student_id, confirmed_at)
           SELECT s.id, $3, now() - make_interval(hours => $4::int) FROM submissions s WHERE s.assignment_id = $1 AND s.group_id = $2`,
          [aid[a], gid[g], uid[m], hours]);
      }
    }
    await submissionModel.refreshStatus({ all: true }, c);
  });
  return { skipped: false };
}

module.exports = seed;

if (require.main === module) {
  const allowed = !env.isProd || process.env.ALLOW_SEED_RESET === 'true';
  if (!allowed) { console.error('Refusing to wipe data in production. Set ALLOW_SEED_RESET=true if you really mean it.'); process.exit(1); }
  seed({ reset: true })
    .then(() => { console.log('Demo data loaded. Sign in with the credentials in the README.'); return pool.end(); })
    .catch((e) => { console.error(e.message); process.exit(1); });
}
