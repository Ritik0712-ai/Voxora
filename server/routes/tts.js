const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { generateSpeech, getVoices, getLanguages } = require('../controllers/ttsController');

router.post('/generate', authenticate, generateSpeech);
router.get('/voices', getVoices);
router.get('/languages', getLanguages);

module.exports = router;
