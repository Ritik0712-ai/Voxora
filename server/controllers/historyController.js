const historyService = require('../services/historyService');

const getHistory = async (req, res, next) => {
  try {
    const result = await historyService.getUserHistory(
      req.user.id,
      req.query.page,
      req.query.limit
    );
    res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    next(err);
  }
};

const getHistoryById = async (req, res, next) => {
  try {
    const generation = await historyService.getHistoryById(req.params.id, req.user.id);
    res.status(200).json({ status: 'success', generation });
  } catch (err) {
    next(err);
  }
};

const deleteHistory = async (req, res, next) => {
  try {
    await historyService.deleteHistory(req.params.id, req.user.id);
    // 204 must not carry a body, so use 200 to keep the JSON contract uniform.
    res.status(200).json({ status: 'success', message: 'Generation deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getHistory, getHistoryById, deleteHistory };
