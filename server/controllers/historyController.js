const historyService = require('../services/historyService');
const storageService = require('../services/storageService');

const getHistory = async (req, res, next) => {
  try {
    const result = await historyService.getUserHistory(
      req.user.id,
      req.query.page,
      req.query.limit
    );
    result.history = result.history.map((item) => ({
      ...item,
      audioUrl: storageService.toAbsoluteUrl(item.audioUrl, req),
    }));
    res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    next(err);
  }
};

const getHistoryById = async (req, res, next) => {
  try {
    const generation = await historyService.getHistoryById(req.params.id, req.user.id);
    generation.audioUrl = storageService.toAbsoluteUrl(generation.audioUrl, req);
    res.status(200).json({ status: 'success', generation });
  } catch (err) {
    next(err);
  }
};

const deleteHistory = async (req, res, next) => {
  try {
    // Look the row up first so the stored audio can be removed too, rather
    // than orphaning the object once the row is gone.
    const generation = await historyService
      .getHistoryById(req.params.id, req.user.id)
      .catch(() => null);

    await historyService.deleteHistory(req.params.id, req.user.id);

    if (generation && generation.audioUrl) {
      storageService.deleteAudio(generation.audioUrl).catch((err) =>
        console.error('Failed to delete stored audio:', err.message)
      );
    }
    // 204 must not carry a body, so use 200 to keep the JSON contract uniform.
    res.status(200).json({ status: 'success', message: 'Generation deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getHistory, getHistoryById, deleteHistory };
