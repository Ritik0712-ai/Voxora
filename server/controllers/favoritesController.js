const favoritesService = require('../services/favoritesService');
const storageService = require('../services/storageService');

const getFavorites = async (req, res, next) => {
  try {
    const favorites = (await favoritesService.getUserFavorites(req.user.id)).map((fav) =>
      fav.speechGeneration
        ? {
            ...fav,
            speechGeneration: {
              ...fav.speechGeneration,
              audioUrl: storageService.toAbsoluteUrl(fav.speechGeneration.audioUrl, req),
            },
          }
        : fav
    );
    res.status(200).json({ status: 'success', favorites });
  } catch (err) {
    next(err);
  }
};

const addFavorite = async (req, res, next) => {
  try {
    const { speechGenerationId, voiceId } = req.body || {};
    const favorite = await favoritesService.addFavorite(
      req.user.id,
      speechGenerationId,
      voiceId
    );
    res.status(201).json({ status: 'success', favorite });
  } catch (err) {
    next(err);
  }
};

const removeFavorite = async (req, res, next) => {
  try {
    await favoritesService.removeFavorite(req.params.id, req.user.id);
    res.status(200).json({ status: 'success', message: 'Favorite removed' });
  } catch (err) {
    next(err);
  }
};

const checkFavorite = async (req, res, next) => {
  try {
    const { speechGenerationId, voiceId } = req.query;
    const isFavorite = await favoritesService.checkFavorite(
      req.user.id,
      speechGenerationId,
      voiceId
    );
    res.status(200).json({ status: 'success', isFavorite });
  } catch (err) {
    next(err);
  }
};

module.exports = { getFavorites, addFavorite, removeFavorite, checkFavorite };
