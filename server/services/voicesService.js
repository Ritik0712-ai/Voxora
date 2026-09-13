const { pool } = require('../config/database');

const getVoices = async (languageCode = null) => {
  let query = `
    SELECT v.id, v.provider_voice_id, v.name, v.gender, v.accent, v.style,
           l.code as language_code, l.name as language_name
    FROM voices v
    JOIN languages l ON v.language_id = l.id
    WHERE v.enabled = true
  `;
  const params = [];

  if (languageCode) {
    query += ` AND l.code = $1`;
    params.push(languageCode);
  }

  query += ` ORDER BY l.name, v.name`;

  const result = await pool.query(query, params);
  return result.rows;
};

const getLanguages = async () => {
  const result = await pool.query(`
    SELECT id, code, name
    FROM languages
    WHERE enabled = true
    ORDER BY name
  `);
  return result.rows;
};

const getVoiceById = async (id) => {
  const result = await pool.query(`
    SELECT v.id, v.provider_voice_id, v.name, v.gender, v.accent, v.style,
           l.code as language_code, l.name as language_name
    FROM voices v
    JOIN languages l ON v.language_id = l.id
    WHERE v.id = $1 AND v.enabled = true
  `, [id]);
  return result.rows[0] || null;
};

module.exports = { getVoices, getLanguages, getVoiceById };
