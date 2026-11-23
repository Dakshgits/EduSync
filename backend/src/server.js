const env = require('./config/env');
const { pool } = require('./config/db');
const createApp = require('./app');
const migrate = require('./database/migrate');
const createAdmin = require('./database/createAdmin');
const seed = require('./database/seed');

async function waitForDb(retries = 20) {
  for (let i = 1; i <= retries; i += 1) {
    try { await pool.query('SELECT 1'); return; } catch (e) {
      console.log(`Waiting for PostgreSQL (${i}/${retries}): ${e.message}`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error('Could not connect to PostgreSQL. Check your DB_* / POSTGRES_* settings.');
}

async function main() {
  env.assertValid();
  await waitForDb();
  await migrate();
  if (env.seedOnStart) {
    const r = await seed({ reset: false }); // only seeds when the database has no users
    console.log(r.skipped ? 'Seed skipped: database already has users' : 'Demo data loaded');
  }
  if (env.admin.password) await createAdmin(); // guarantees an admin exists (no-op if present)
  createApp().listen(env.port, () => console.log(`EduSync API listening on port ${env.port}`));
}

main().catch((e) => { console.error(e.message); process.exit(1); });
