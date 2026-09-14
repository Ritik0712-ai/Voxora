const authService = require('../services/authService');
const { ValidationError } = require('../utils/errors');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};

    if (!name || !String(name).trim()) {
      throw new ValidationError('Name is required.');
    }
    if (!email || !EMAIL_RE.test(String(email).trim())) {
      throw new ValidationError('A valid email address is required.');
    }
    if (!password || String(password).length < 8) {
      throw new ValidationError('Password must be at least 8 characters.');
    }

    const result = await authService.register(
      String(name).trim(),
      String(email).trim().toLowerCase(),
      String(password)
    );

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
    const { email, password } = req.body || {};

    if (!email || !password) {
      throw new ValidationError('Email and password are required.');
    }

    const result = await authService.login(
      String(email).trim().toLowerCase(),
      String(password)
    );

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
    const user = await authService.getProfile(req.user.id);
    res.status(200).json({ status: 'success', user });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, logout, me, getProfile: me };
