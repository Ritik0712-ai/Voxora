const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getHistory, getHistoryById, deleteHistory } = require('../controllers/historyController');

router.get('/', authenticate, getHistory);
router.get('/:id', authenticate, getHistoryById);
router.delete('/:id', authenticate, deleteHistory);

module.exports = router;
