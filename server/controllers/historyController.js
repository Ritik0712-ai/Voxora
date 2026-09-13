const historyService = require('../services/historyService');

const getHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const result = await historyService.getUserHistory(req.user.id, page, limit);
    res.status(200).json({
      status: 'success',
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

const getHistoryById = async (req, res, next) => {
  try {
    const history = await historyService.getHistoryById(req.params.id, req.user.id);
    res.status(200).json({ status: 'success', history });
  } catch (err) {
    next(err);
  }
};

const deleteHistory = async (req, res, next) => {
  try {
    await historyService.deleteHistory(req.params.id, req.user.id);
    res.status(204).json({ status: 'success', message: 'History deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getHistory, getHistoryById, deleteHistory };
