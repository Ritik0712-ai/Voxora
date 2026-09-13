const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getFavorites, addFavorite, removeFavorite, checkFavorite } = require('../controllers/favoritesController');

router.get('/', authenticate, getFavorites);
router.post('/', authenticate, addFavorite);
router.delete('/:id', authenticate, removeFavorite);
router.get('/check/:type/:id', authenticate, checkFavorite);

module.exports = router;
