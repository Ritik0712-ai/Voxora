const express = require('express');
const router = express.Router();
const { getVoices, getLanguages } = require('../controllers/voicesController');

router.get('/', getVoices);
router.get('/languages', getLanguages);

module.exports = router;
