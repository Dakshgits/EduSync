const env = require('../config/env');
const { pool } = require('../config/db');
const userModel = require('../models/userModel');
const { hash } = require('../services/authService');

async function createAdmin() {
  if (!env.admin.password || env.admin.password.length < 8) throw new Error('Set ADMIN_PASSWORD (8+ characters) in your .env first');
  if (await userModel.findAuthByEmail(env.admin.email)) return { created: false };
  await userModel.createAdmin({ full_name: env.admin.name, email: env.admin.email, password_hash: await hash(env.admin.password) });
  return { created: true };
}

module.exports = createAdmin;

if (require.main === module) {
  createAdmin()
    .then((r) => { console.log(r.created ? `Admin created: ${env.admin.email}` : 'Admin already exists'); return pool.end(); })
    .catch((e) => { console.error(e.message); process.exit(1); });
}
