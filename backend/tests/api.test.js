/* End-to-end API tests against a real PostgreSQL database (a throw-away "<db>_test" database). */
process.env.NODE_ENV = 'test';
const base = process.env.POSTGRES_DB || 'edusync';
process.env.DB_NAME = `${base}_test`;

const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const env = require('../src/config/env');

let server; let url; let pool;
const jar = {}; // name -> cookie header

async function api(method, path, { body, as, headers = {} } = {}) {
  const h = { 'Content-Type': 'application/json', ...headers };
  if (as && jar[as]) h.Cookie = jar[as];
  const res = await fetch(`${url}/api${path}`, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  const set = res.headers.getSetCookie?.() || [];
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json, data: json.data, setCookie: set };
}
async function register(key, n) {
  const r = await api('POST', '/auth/register', { body: { full_name: `Test ${key}`, email: `${key}@test.dev`, student_id: `T${String(n).padStart(3, '0')}`, password: 'Passw0rdX', confirm_password: 'Passw0rdX' } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  jar[key] = r.setCookie.map((c) => c.split(';')[0]).join('; ');
  return r.data.user;
}
async function login(key, email, password) {
  const r = await api('POST', '/auth/login', { body: { email, password } });
  if (r.status === 200) jar[key] = r.setCookie.map((c) => c.split(';')[0]).join('; ');
  return r;
}
const future = (d) => new Date(Date.now() + d * 864e5).toISOString();
const link = 'https://onedrive.live.com/?id=TEST';
const mkAssignment = (extra = {}) => ({ title: 'Test assignment', description: 'd', due_date: future(7), onedrive_link: link, target_type: 'ALL', ...extra });

before(async () => {
  const admin = new Client({ host: env.db.host, port: env.db.port, user: env.db.user, password: env.db.password, database: 'postgres' });
  await admin.connect();
  const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [env.db.database]);
  if (!exists.rowCount) await admin.query(`CREATE DATABASE "${env.db.database}"`);
  await admin.end();
  ({ pool } = require('../src/config/db'));
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await require('../src/database/migrate')({ log: () => {} });
  await require('../src/database/createAdmin')();
  server = require('../src/app')().listen(0);
  url = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await login('admin', env.admin.email, env.admin.password)).status, 200);
});
after(async () => { server?.close(); await pool?.end(); });

describe('authentication & authorization', () => {
  test('registers a student and ignores a smuggled role', async () => {
    const r = await api('POST', '/auth/register', { body: { full_name: 'Eve Evil', email: 'eve@test.dev', student_id: 'E001', password: 'Passw0rdX', confirm_password: 'Passw0rdX', role: 'ADMIN' } });
    assert.equal(r.status, 201);
    assert.equal(r.data.user.role, 'STUDENT');
    assert.equal(r.data.user.password_hash, undefined);
    assert.ok(r.setCookie.some((c) => /HttpOnly/i.test(c)), 'cookie must be HttpOnly');
  });
  test('rejects duplicate email and duplicate student id', async () => {
    let r = await api('POST', '/auth/register', { body: { full_name: 'Dup', email: 'EVE@test.dev', student_id: 'E002', password: 'Passw0rdX', confirm_password: 'Passw0rdX' } });
    assert.equal(r.status, 409); assert.ok(r.body.error.details.email);
    r = await api('POST', '/auth/register', { body: { full_name: 'Dup', email: 'dup@test.dev', student_id: 'e001', password: 'Passw0rdX', confirm_password: 'Passw0rdX' } });
    assert.equal(r.status, 409); assert.ok(r.body.error.details.student_id);
  });
  test('validates input (weak password, mismatch, bad email)', async () => {
    const r = await api('POST', '/auth/register', { body: { full_name: 'X', email: 'nope', student_id: '!', password: 'short', confirm_password: 'different' } });
    assert.equal(r.status, 422);
    for (const f of ['full_name', 'email', 'student_id', 'password', 'confirm_password']) assert.ok(r.body.error.details[f], f);
  });
  test('login success, wrong password, unknown user', async () => {
    assert.equal((await login('eve', 'eve@test.dev', 'Passw0rdX')).status, 200);
    assert.equal((await login('x', 'eve@test.dev', 'wrongpass1')).status, 401);
    assert.equal((await login('x', 'ghost@test.dev', 'Passw0rdX')).status, 401);
  });
  test('protected routes need a valid token', async () => {
    assert.equal((await api('GET', '/auth/me')).status, 401);
    assert.equal((await api('GET', '/assignments', { headers: { Authorization: 'Bearer garbage' } })).status, 401);
    const me = await api('GET', '/auth/me', { as: 'eve' });
    assert.equal(me.status, 200); assert.equal(me.data.user.email, 'eve@test.dev');
  });
  test('students cannot use admin endpoints; admin cannot use student endpoints', async () => {
    assert.equal((await api('POST', '/assignments', { as: 'eve', body: mkAssignment() })).status, 403);
    assert.equal((await api('GET', '/analytics/admin', { as: 'eve' })).status, 403);
    assert.equal((await api('POST', '/groups', { as: 'admin', body: { group_name: 'Nope' } })).status, 403);
  });
  test('logout clears the cookie', async () => {
    const r = await api('POST', '/auth/logout');
    assert.equal(r.status, 200);
    assert.ok(r.setCookie.some((c) => c.startsWith('edusync_token=;')));
  });
});

describe('groups & invitations', () => {
  let s1; let s2; let s3; let s4; let s5; let s6; let s7; let groupId; let inv2; let inv3;
  before(async () => {
    [s1, s2, s3, s4, s5, s6, s7] = await Promise.all([1, 2, 3, 4, 5, 6, 7].map((n) => register(`s${n}`, n)));
  });
  test('creates a group; creator becomes leader; second group blocked', async () => {
    const r = await api('POST', '/groups', { as: 's1', body: { group_name: 'Team One' } });
    assert.equal(r.status, 201); groupId = r.data.id;
    assert.equal(r.data.my_role, 'LEADER'); assert.equal(r.data.members.length, 1);
    assert.equal((await api('POST', '/groups', { as: 's1', body: { group_name: 'Another' } })).status, 409);
    assert.equal((await api('POST', '/groups', { as: 's2', body: { group_name: 'team one' } })).status, 409, 'group names are unique (case-insensitive)');
  });
  test('invite validation: unknown student, self, non-leader', async () => {
    assert.equal((await api('POST', `/groups/${groupId}/invitations`, { as: 's1', body: { identifier: 'nobody@x.dev' } })).status, 404);
    assert.equal((await api('POST', `/groups/${groupId}/invitations`, { as: 's1', body: { identifier: 's1@test.dev' } })).status, 400);
    assert.equal((await api('POST', `/groups/${groupId}/invitations`, { as: 's2', body: { identifier: 's3@test.dev' } })).status, 403);
    assert.equal((await api('POST', `/groups/${groupId}/invitations`, { as: 'admin', body: { identifier: 's3@test.dev' } })).status, 403);
  });
  test('invite by email and by student ID; duplicate pending blocked', async () => {
    let r = await api('POST', `/groups/${groupId}/invitations`, { as: 's1', body: { identifier: 'S2@test.dev' } });
    assert.equal(r.status, 201); inv2 = r.data.id;
    r = await api('POST', `/groups/${groupId}/invitations`, { as: 's1', body: { identifier: 't003' } });
    assert.equal(r.status, 201); inv3 = r.data.id;
    assert.equal((await api('POST', `/groups/${groupId}/invitations`, { as: 's1', body: { identifier: 's2@test.dev' } })).status, 409);
  });
  test('pending invitees are NOT members until they accept', async () => {
    const g = await api('GET', `/groups/${groupId}`, { as: 's1' });
    assert.equal(g.data.members.length, 1);
    assert.equal(g.data.invitations.filter((i) => i.status === 'PENDING').length, 2);
    assert.equal((await api('GET', `/groups/${groupId}`, { as: 's2' })).status, 403);
  });
  test('only the invited student can respond; accept and reject work once', async () => {
    assert.equal((await api('POST', `/invitations/${inv2}/accept`, { as: 's3' })).status, 404);
    assert.equal((await api('POST', `/invitations/${inv2}/accept`, { as: 's2' })).status, 200);
    assert.equal((await api('POST', `/invitations/${inv2}/accept`, { as: 's2' })).status, 409);
    assert.equal((await api('POST', `/invitations/${inv3}/reject`, { as: 's3' })).status, 200);
    const mine = await api('GET', '/invitations', { as: 's3' });
    assert.equal(mine.data[0].status, 'REJECTED');
    const g = await api('GET', `/groups/${groupId}`, { as: 's1' });
    assert.deepEqual(g.data.members.map((m) => m.id).sort(), [s1.id, s2.id].sort());
  });
  test('a student already in a group cannot be invited or accept another', async () => {
    assert.equal((await api('POST', `/groups/${groupId}/invitations`, { as: 's1', body: { identifier: 's2@test.dev' } })).status, 409);
    const g2 = await api('POST', '/groups', { as: 's4', body: { group_name: 'Team Two' } });
    const r = await api('POST', `/groups/${g2.data.id}/invitations`, { as: 's4', body: { identifier: 's2@test.dev' } });
    assert.equal(r.status, 409);
  });
  test('group size limit counts pending invitations', async () => {
    const gid = (await api('POST', '/groups', { as: 's5', body: { group_name: 'Full Team' } })).data.id;
    const ids = ['s3@test.dev', 's6@test.dev', 's7@test.dev', 'eve@test.dev'];
    for (const i of ids) assert.equal((await api('POST', `/groups/${gid}/invitations`, { as: 's5', body: { identifier: i } })).status, 201);
    assert.equal((await api('POST', `/groups/${gid}/invitations`, { as: 's5', body: { identifier: 's1@test.dev' } })).status, 409);
  });
  test('only the leader can remove others; members can leave; leadership transfers', async () => {
    assert.equal((await api('DELETE', `/groups/${groupId}/members/${s1.id}`, { as: 's2' })).status, 403);
    const r = await api('DELETE', `/groups/${groupId}/members/${s1.id}`, { as: 's1' }); // leader leaves
    assert.equal(r.status, 200); assert.equal(r.data.dissolved, false);
    const g = await api('GET', `/groups/${groupId}`, { as: 's2' });
    assert.equal(g.data.my_role, 'LEADER'); assert.equal(g.data.members.length, 1);
  });
});

describe('assignments, targeting, confirmation, progress, analytics', () => {
  let a, b, c; // students a,b in group GA; c in group GB; d has no group
  let gA; let gB; let allAssign; let selAssign; let subAll; let subSel;
  before(async () => {
    for (const [k, n] of [['a', 11], ['b', 12], ['c', 13], ['d', 14]]) await register(k, n);
    a = (await api('GET', '/auth/me', { as: 'a' })).data.user;
    b = (await api('GET', '/auth/me', { as: 'b' })).data.user;
    c = (await api('GET', '/auth/me', { as: 'c' })).data.user;
    gA = (await api('POST', '/groups', { as: 'a', body: { group_name: 'GA' } })).data.id;
    gB = (await api('POST', '/groups', { as: 'c', body: { group_name: 'GB' } })).data.id;
    const inv = await api('POST', `/groups/${gA}/invitations`, { as: 'a', body: { identifier: 'b@test.dev' } });
    await api('POST', `/invitations/${inv.data.id}/accept`, { as: 'b' });
  });

  test('assignment validation: bad link host, http link, missing groups', async () => {
    assert.equal((await api('POST', '/assignments', { as: 'admin', body: mkAssignment({ onedrive_link: 'https://evil.example.com/x' }) })).status, 422);
    assert.equal((await api('POST', '/assignments', { as: 'admin', body: mkAssignment({ onedrive_link: 'http://onedrive.live.com/x' }) })).status, 422);
    assert.equal((await api('POST', '/assignments', { as: 'admin', body: mkAssignment({ onedrive_link: 'javascript:alert(1)' }) })).status, 422);
    assert.equal((await api('POST', '/assignments', { as: 'admin', body: mkAssignment({ target_type: 'SELECTED_GROUPS', group_ids: [] }) })).status, 422);
    assert.equal((await api('POST', '/assignments', { as: 'admin', body: mkAssignment({ target_type: 'SELECTED_GROUPS', group_ids: [999999] }) })).status, 422);
  });
  test('creates ALL and SELECTED_GROUPS assignments; submission rows are created per group', async () => {
    let r = await api('POST', '/assignments', { as: 'admin', body: mkAssignment({ title: 'For everyone' }) });
    assert.equal(r.status, 201); allAssign = r.data.id;
    assert.ok(r.data.submissions.length >= 2);
    r = await api('POST', '/assignments', { as: 'admin', body: mkAssignment({ title: 'Only GA', target_type: 'SELECTED_GROUPS', group_ids: [gA] }) });
    assert.equal(r.status, 201); selAssign = r.data.id;
    assert.deepEqual(r.data.submissions.map((s) => s.group_id), [gA]);
  });
  test('student visibility: ALL for everyone, selected only for targeted group', async () => {
    const titles = async (k) => (await api('GET', '/assignments', { as: k })).data.map((x) => x.title);
    assert.ok((await titles('a')).includes('Only GA'));
    assert.ok(!(await titles('c')).includes('Only GA'));
    assert.ok(!(await titles('d')).includes('Only GA'));
    assert.ok((await titles('d')).includes('For everyone'));
    assert.equal((await api('GET', `/assignments/${selAssign}`, { as: 'c' })).status, 404);
    assert.equal((await api('GET', `/assignments/${selAssign}`, { as: 'a' })).status, 200);
  });
  test('a group created AFTER an ALL assignment still gets its submission row', async () => {
    const list = (await api('GET', '/assignments', { as: 'c' })).data.find((x) => x.id === allAssign);
    assert.ok(list.submission_id); assert.equal(list.total_members, 1);
    subAll = (await api('GET', '/assignments', { as: 'a' })).data.find((x) => x.id === allAssign).submission_id;
    subSel = (await api('GET', '/assignments', { as: 'a' })).data.find((x) => x.id === selAssign).submission_id;
  });
  test('confirmation: authorization rules', async () => {
    assert.equal((await api('POST', `/submissions/${subAll}/confirm`, { as: 'c' })).status, 403, 'other group');
    assert.equal((await api('POST', `/submissions/${subAll}/confirm`, { as: 'd' })).status, 403, 'no group');
    assert.equal((await api('POST', `/submissions/${subAll}/confirm`, { as: 'admin' })).status, 403, 'admin');
    assert.equal((await api('POST', `/submissions/999999/confirm`, { as: 'a' })).status, 404);
    assert.equal((await api('GET', `/submissions/${subAll}`, { as: 'c' })).status, 403);
  });
  test('partial then full group completion; duplicates blocked', async () => {
    let r = await api('POST', `/submissions/${subAll}/confirm`, { as: 'a' });
    assert.equal(r.status, 201);
    assert.equal(r.data.status, 'PARTIAL'); assert.equal(r.data.confirmed_members, 1); assert.equal(r.data.total_members, 2); assert.equal(r.data.percent, 50);
    assert.equal((await api('POST', `/submissions/${subAll}/confirm`, { as: 'a' })).status, 409);
    const adminView = await api('GET', `/submissions?assignment_id=${allAssign}&group_id=${gA}`, { as: 'admin' });
    assert.equal(adminView.data[0].status, 'PARTIAL');
    r = await api('POST', `/submissions/${subAll}/confirm`, { as: 'b' });
    assert.equal(r.data.status, 'SUBMITTED'); assert.equal(r.data.percent, 100);
    assert.ok(r.data.members.every((m) => m.confirmed && m.confirmed_at));
    const prog = await api('GET', `/submissions/${subAll}/progress`, { as: 'a' });
    assert.equal(prog.data.confirmed_members, 2);
  });
  test('concurrent duplicate confirmations: exactly one succeeds', async () => {
    const results = await Promise.all([1, 2, 3, 4, 5].map(() => api('POST', `/submissions/${subSel}/confirm`, { as: 'a' })));
    assert.equal(results.filter((r) => r.status === 201).length, 1);
    assert.equal(results.filter((r) => r.status === 409).length, 4);
    const n = (await pool.query('SELECT COUNT(*)::int n FROM submission_confirmations WHERE submission_id = $1', [subSel])).rows[0].n;
    assert.equal(n, 1);
  });
  test('membership change recalculates progress live (new member -> back to PARTIAL)', async () => {
    const reg = await register('e', 15);
    const inv = await api('POST', `/groups/${gA}/invitations`, { as: 'a', body: { identifier: 'e@test.dev' } });
    await api('POST', `/invitations/${inv.data.id}/accept`, { as: 'e' });
    const r = await api('GET', `/submissions/${subAll}`, { as: 'a' });
    assert.equal(r.data.total_members, 3); assert.equal(r.data.status, 'PARTIAL'); assert.equal(r.data.percent, 67);
    const stored = (await pool.query('SELECT status FROM submissions WHERE id = $1', [subAll])).rows[0].status;
    assert.equal(stored, 'PARTIAL', 'stored status is kept in sync');
    await api('DELETE', `/groups/${gA}/members/${reg.id}`, { as: 'a' }); // remove again
    assert.equal((await api('GET', `/submissions/${subAll}`, { as: 'a' })).data.status, 'SUBMITTED');
  });
  test('analytics match independent SQL counts', async () => {
    const an = (await api('GET', '/analytics/admin', { as: 'admin' })).data;
    const sql = (await pool.query(`SELECT COUNT(*)::int total,
      COUNT(*) FILTER (WHERE (SELECT COUNT(*) FROM submission_confirmations sc JOIN group_members gm ON gm.user_id = sc.student_id AND gm.group_id = s.group_id WHERE sc.submission_id = s.id) = (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = s.group_id) AND (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = s.group_id) > 0)::int submitted
      FROM submissions s`)).rows[0];
    assert.equal(an.submissions.total, sql.total); assert.equal(an.submissions.submitted, sql.submitted);
    assert.equal(an.submissions.submitted + an.submissions.partial + an.submissions.pending, an.submissions.total);
    assert.equal(an.totals.students, (await pool.query("SELECT COUNT(*)::int n FROM users WHERE role='STUDENT'")).rows[0].n);
    const per = (await api('GET', '/analytics/assignments', { as: 'admin' })).data.find((x) => x.id === allAssign);
    const nGroups = (await pool.query('SELECT COUNT(*)::int n FROM groups')).rows[0].n; // an ALL assignment targets every group, including those from earlier tests
    assert.equal(per.total, nGroups); assert.equal(per.submitted, 1); assert.equal(per.completion_percent, Math.round(100 / nGroups));
    const grp = (await api('GET', '/analytics/groups', { as: 'admin' })).data.find((x) => x.id === gA);
    assert.ok(grp.submitted >= 1);
    const st = (await api('GET', '/analytics/student', { as: 'a' })).data;
    assert.equal(st.group_name, 'GA'); assert.equal(st.my_confirmed, 2);
  });
  test('editing: retargeting blocked when it would orphan confirmations; allowed otherwise', async () => {
    const body = mkAssignment({ title: 'Only GA (edited)', target_type: 'SELECTED_GROUPS', group_ids: [gB] });
    assert.equal((await api('PUT', `/assignments/${selAssign}`, { as: 'admin', body })).status, 409);
    let r = await api('PUT', `/assignments/${selAssign}`, { as: 'admin', body: mkAssignment({ title: 'Renamed', target_type: 'SELECTED_GROUPS', group_ids: [gA, gB] }) });
    assert.equal(r.status, 200); assert.equal(r.data.title, 'Renamed'); assert.equal(r.data.submissions.length, 2);
    assert.equal((await api('PUT', `/assignments/${selAssign}`, { as: 'a', body: mkAssignment() })).status, 403);
    r = await api('PUT', `/assignments/${allAssign}`, { as: 'admin', body: mkAssignment({ title: 'For everyone', due_date: future(30) }) });
    assert.equal(r.status, 200);
  });
  test('deleting an assignment cascades to submissions and confirmations', async () => {
    assert.equal((await api('DELETE', `/assignments/${allAssign}`, { as: 'a' })).status, 403);
    const r = await api('DELETE', `/assignments/${allAssign}`, { as: 'admin' });
    assert.equal(r.status, 200); assert.ok(r.data.confirmations >= 2);
    assert.equal((await api('GET', `/assignments/${allAssign}`, { as: 'admin' })).status, 404);
    assert.equal((await pool.query('SELECT COUNT(*)::int n FROM submissions WHERE assignment_id = $1', [allAssign])).rows[0].n, 0);
  });
});
