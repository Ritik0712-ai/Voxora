const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const ttsService = require('../services/ttsService');

router.get('/', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: 'unknown',
    ttsProvider: ttsService.getProviderName(),
    ttsConfigured: ttsService.isConfigured(),
  };

  try {
    await pool.query('SELECT 1');
    health.database = 'connected';
  } catch (err) {
    health.database = 'error';
    health.status = 'degraded';
    health.databaseError = err.message;
  }

  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

module.exports = router;
