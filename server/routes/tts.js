const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { generateSpeech } = require('../controllers/ttsController');
const { getVoices, getLanguages } = require('../controllers/voicesController');

router.post('/', authenticate, generateSpeech);
router.post('/generate', authenticate, generateSpeech);
router.get('/voices', getVoices);
router.get('/languages', getLanguages);

module.exports = router;
