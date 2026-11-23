const { Pool } = require('pg');
const env = require('./env');

const ssl = env.db.ssl ? { rejectUnauthorized: false } : undefined;
const pool = new Pool(
  env.db.url
    ? { connectionString: env.db.url, ssl, max: 10 }
    : { host: env.db.host, port: env.db.port, user: env.db.user, password: env.db.password, database: env.db.database, ssl, max: 10 }
);

pool.on('error', (err) => console.error('Unexpected PostgreSQL pool error', err.message));

/** Run fn(client) inside a transaction; rolls back on any thrown error. */
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query: (text, params) => pool.query(text, params), withTransaction };
