const { pool } = require('../config/database');

const getPreferences = async (userId) => {
  const result = await pool.query(
    'SELECT * FROM user_preferences WHERE user_id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    return {
      defaultLanguageId: null,
      defaultVoiceId: null,
      defaultSpeed: 1.0,
      defaultPitch: 1.0,
    };
  }

  const row = result.rows[0];
  return {
    defaultLanguageId: row.default_language_id,
    defaultVoiceId: row.default_voice_id,
    defaultSpeed: parseFloat(row.default_speed) || 1.0,
    defaultPitch: parseFloat(row.default_pitch) || 1.0,
  };
};

const updatePreferences = async (userId, defaultLanguageId, defaultVoiceId, defaultSpeed, defaultPitch) => {
  const result = await pool.query(
    `INSERT INTO user_preferences (user_id, default_language_id, default_voice_id, default_speed, default_pitch, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET
       default_language_id = EXCLUDED.default_language_id,
       default_voice_id = EXCLUDED.default_voice_id,
       default_speed = EXCLUDED.default_speed,
       default_pitch = EXCLUDED.default_pitch,
       updated_at = NOW()
     RETURNING *`,
    [userId, defaultLanguageId, defaultVoiceId, defaultSpeed, defaultPitch]
  );

  const row = result.rows[0];
  return {
    defaultLanguageId: row.default_language_id,
    defaultVoiceId: row.default_voice_id,
    defaultSpeed: parseFloat(row.default_speed) || 1.0,
    defaultPitch: parseFloat(row.default_pitch) || 1.0,
  };
};

module.exports = { getPreferences, updatePreferences };
