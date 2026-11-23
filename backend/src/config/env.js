const path = require('path');
const dotenv = require('dotenv');

// Load backend/.env first, then the project-root .env (existing variables are never overridden).
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const bool = (v, d) => (v === undefined || v === '' ? d : String(v).toLowerCase() === 'true');
const nodeEnv = process.env.NODE_ENV || 'development';

const env = {
  nodeEnv,
  isProd: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port: parseInt(process.env.PORT || '5000', 10),
  db: {
    url: process.env.DATABASE_URL || null,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.POSTGRES_USER || 'edusync',
    password: process.env.POSTGRES_PASSWORD || '',
    database: process.env.DB_NAME || process.env.POSTGRES_DB || 'edusync',
    ssl: bool(process.env.DB_SSL, false),
  },
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresHours: parseInt(process.env.JWT_EXPIRES_HOURS || '8', 10),
  cookie: {
    secure: bool(process.env.COOKIE_SECURE, nodeEnv === 'production'),
    sameSite: (process.env.COOKIE_SAMESITE || 'lax').toLowerCase(), // lax | strict | none
  },
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim()).filter(Boolean),
  groupMaxSize: parseInt(process.env.GROUP_MAX_SIZE || '5', 10),
  migrationsDir: process.env.MIGRATIONS_DIR || path.resolve(__dirname, '../../../database/migrations'),
  allowedLinkHosts: (process.env.ONEDRIVE_ALLOWED_HOSTS || '1drv.ms,onedrive.live.com,onedrive.com,sharepoint.com,office.com,microsoft.com')
    .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
  seedOnStart: bool(process.env.SEED_ON_START, false),
  admin: {
    name: process.env.ADMIN_NAME || 'Prof. Admin',
    email: process.env.ADMIN_EMAIL || 'admin@edusync.demo',
    password: process.env.ADMIN_PASSWORD || '',
  },
  demoPassword: process.env.DEMO_STUDENT_PASSWORD || '',
};

env.assertValid = () => {
  const problems = [];
  if (!env.jwtSecret || env.jwtSecret.length < 16 || env.jwtSecret.startsWith('change-me')) {
    problems.push('JWT_SECRET is missing or still the placeholder. Generate one: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
  }
  if (!env.db.url && !env.db.password) problems.push('POSTGRES_PASSWORD is not set (copy .env.example to .env and fill it in).');
  if (problems.length) {
    throw new Error('Invalid configuration:\n - ' + problems.join('\n - '));
  }
};

module.exports = env;
