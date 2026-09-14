require('dotenv').config();
const { pool } = require('../config/database');

// Translation goes through an undocumented public endpoint, so repeated calls
// for the same text are both wasteful and a rate-limit risk. Cache by a hash of
// (source text + target language) rather than the text itself, so the key stays
// a fixed size regardless of input length.
const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS translation_cache (
     id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     cache_key       CHAR(64) NOT NULL UNIQUE,
     source_text     TEXT NOT NULL,
     target_language VARCHAR(16) NOT NULL,
     translated_text TEXT NOT NULL,
     detected_language VARCHAR(16),
     hit_count       INTEGER NOT NULL DEFAULT 0,
     created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     last_used_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE INDEX IF NOT EXISTS translation_cache_last_used_idx
     ON translation_cache (last_used_at)`,
];

(async () => {
  for (const sql of STATEMENTS) {
    await pool.query(sql);
    console.log('  ok:', sql.trim().split('\n')[0]);
  }
  const r = await pool.query('SELECT COUNT(*)::int c FROM translation_cache');
  console.log(`\ntranslation_cache ready (${r.rows[0].c} rows)`);
  process.exit(0);
})().catch((e) => {
  console.error('MIGRATION FAILED:', e.message);
  process.exit(1);
});
