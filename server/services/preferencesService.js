const { pool } = require('../config/database');
const { AppError } = require('../utils/errors');

const getPreferences = async (userId) => {
  const result = await pool.query(
    `SELECT up.*, l.name as default_language_name, v.name as default_voice_name
     FROM user_preferences up
     LEFT JOIN languages l ON up.default_language_id = l.id
     LEFT JOIN voices v ON up.default_voice_id = v.id
     WHERE up.user_id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return {
      userId,
      defaultLanguageId: null,
      defaultLanguageName: null,
      defaultVoiceId: null,
      defaultVoiceName: null,
      defaultSpeed: 1.0,
      defaultPitch: 0
    };
  }

  const pref = result.rows[0];
  return {
    userId: pref.user_id,
    defaultLanguageId: pref.default_language_id,
    defaultLanguageName: pref.default_language_name,
    defaultVoiceId: pref.default_voice_id,
    defaultVoiceName: pref.default_voice_name,
    defaultSpeed: pref.default_speed || 1.0,
    defaultPitch: pref.default_pitch || 0
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

  return getPreferences(userId);
};

module.exports = { getPreferences, updatePreferences };
