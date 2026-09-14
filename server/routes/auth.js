const express = require('express');
const router = express.Router();
const { register, login, logout, getProfile, me } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', authenticate, logout);
router.get('/profile', authenticate, getProfile);
router.get('/me', authenticate, me);

module.exports = router;
