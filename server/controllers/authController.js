const authService = require('../services/authService');

const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const result = await authService.register(name, email, password);
    res.status(201).json({
      status: 'success',
      token: result.token,
      user: result.user,
    });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.status(200).json({
      status: 'success',
      token: result.token,
      user: result.user,
    });
  } catch (err) {
    next(err);
  }
};

const logout = (req, res) => {
  res.status(200).json({ status: 'success', message: 'Logged out successfully' });
};

const me = async (req, res, next) => {
  try {
    const user = await authService.getUserById(req.user.id);
    res.status(200).json({ status: 'success', user });
  } catch (err) {
    next(err);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const user = await authService.getUserById(req.user.id);
    res.status(200).json({ status: 'success', user });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, logout, me, getProfile };
