require('dotenv').config();
const { pool } = require('../config/database');

// Speech generations now record what the user typed as well as what was
// actually spoken, so History can show both sides of a translation.
const STATEMENTS = [
  `ALTER TABLE speech_generations
     ADD COLUMN IF NOT EXISTS source_text TEXT`,
  `ALTER TABLE speech_generations
     ADD COLUMN IF NOT EXISTS source_language VARCHAR(16)`,
  `ALTER TABLE speech_generations
     ADD COLUMN IF NOT EXISTS was_translated BOOLEAN NOT NULL DEFAULT false`,
];

(async () => {
  for (const sql of STATEMENTS) {
    await pool.query(sql);
    console.log('  ok:', sql.split('\n')[1].trim());
  }

  const cols = await pool.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='speech_generations'
      ORDER BY ordinal_position`
  );
  console.log('\nspeech_generations columns:');
  console.log('  ' + cols.rows.map((r) => r.column_name).join(', '));
  process.exit(0);
})().catch((e) => {
  console.error('MIGRATION FAILED:', e.message);
  process.exit(1);
});
