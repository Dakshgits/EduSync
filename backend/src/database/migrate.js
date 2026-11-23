const fs = require('fs');
const path = require('path');
const env = require('../config/env');
const { pool } = require('../config/db');

async function migrate({ log = console.log } = {}) {
  const dir = env.migrationsDir;
  if (!fs.existsSync(dir)) throw new Error(`Migrations folder not found: ${dir}`);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  const client = await pool.connect();
  try {
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())');
    const done = new Set((await client.query('SELECT filename FROM schema_migrations')).rows.map((r) => r.filename));
    for (const f of files) {
      if (done.has(f)) continue;
      log(`Applying migration ${f}`);
      try {
        await client.query('BEGIN');
        await client.query(fs.readFileSync(path.join(dir, f), 'utf8'));
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [f]);
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${f} failed: ${e.message}`);
      }
    }
    log('Database is up to date');
  } finally {
    client.release();
  }
}

module.exports = migrate;

if (require.main === module) {
  migrate().then(() => pool.end()).catch((e) => { console.error(e.message); process.exit(1); });
}
