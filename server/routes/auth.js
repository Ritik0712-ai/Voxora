const express = require('express');
const router = express.Router();
const { register, login, logout, me, getProfile } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', authenticate, logout);
router.get('/profile', authenticate, getProfile);
router.get('/me', authenticate, me);

module.exports = router;
