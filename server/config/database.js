const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Add it to server/.env before starting the server.');
}

// Neon requires TLS in every environment. `rejectUnauthorized: false` is needed
// because Neon's pooler presents a cert chain Node won't verify by default.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle Postgres client:', err.message);
});

module.exports = { pool };
