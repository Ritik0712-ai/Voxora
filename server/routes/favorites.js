const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getFavorites, addFavorite, removeFavorite } = require('../controllers/favoritesController');

router.get('/', authenticate, getFavorites);
router.post('/', authenticate, addFavorite);
router.delete('/:id', authenticate, removeFavorite);

module.exports = router;
