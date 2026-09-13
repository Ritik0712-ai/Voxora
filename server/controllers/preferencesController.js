const preferencesService = require('../services/preferencesService');

const getPreferences = async (req, res, next) => {
  try {
    const preferences = await preferencesService.getPreferences(req.user.id);
    res.status(200).json({ status: 'success', preferences });
  } catch (err) {
    next(err);
  }
};

const updatePreferences = async (req, res, next) => {
  try {
    const { defaultLanguageId, defaultVoiceId, defaultSpeed, defaultPitch } = req.body;
    const preferences = await preferencesService.updatePreferences(
      req.user.id,
      defaultLanguageId,
      defaultVoiceId,
      defaultSpeed,
      defaultPitch
    );
    res.status(200).json({ status: 'success', preferences });
  } catch (err) {
    next(err);
  }
};

module.exports = { getPreferences, updatePreferences };
