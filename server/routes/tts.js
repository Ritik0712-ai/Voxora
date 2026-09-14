const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');
const { generateSpeech } = require('../controllers/ttsController');
const { getVoices, getLanguages } = require('../controllers/voicesController');

// Generating speech works signed out; history is only recorded when signed in.
router.post('/', optionalAuth, generateSpeech);
router.post('/generate', optionalAuth, generateSpeech);
router.post('/synthesize', optionalAuth, generateSpeech);

router.get('/voices', getVoices);
router.get('/languages', getLanguages);

module.exports = router;
