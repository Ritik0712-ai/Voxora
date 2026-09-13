const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getPreferences, updatePreferences } = require('../controllers/preferencesController');

router.get('/', authenticate, getPreferences);
router.put('/', authenticate, updatePreferences);

module.exports = router;
