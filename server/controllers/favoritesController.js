const favoritesService = require('../services/favoritesService');

const getFavorites = async (req, res, next) => {
  try {
    const favorites = await favoritesService.getUserFavorites(req.user.id);
    res.status(200).json({ status: 'success', favorites });
  } catch (err) {
    next(err);
  }
};

const addFavorite = async (req, res, next) => {
  try {
    const { speechGenerationId, voiceId } = req.body;
    const favorite = await favoritesService.addFavorite(req.user.id, speechGenerationId, voiceId);
    res.status(201).json({ status: 'success', favorite });
  } catch (err) {
    next(err);
  }
};

const removeFavorite = async (req, res, next) => {
  try {
    await favoritesService.removeFavorite(req.params.id, req.user.id);
    res.status(204).json({ status: 'success', message: 'Favorite removed' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getFavorites, addFavorite, removeFavorite };
