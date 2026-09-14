const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { AuthenticationError, AppError } = require('../utils/errors');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set. Add it to server/.env before starting the server.');
}

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

const register = async (name, email, password) => {
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      throw new AppError('Email already registered', 400);
    }

    const hashedPassword = await hashPassword(password);

    const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, created_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW())
     RETURNING id, name, email, created_at`,
    [name, email, hashedPassword]
    );

    const user = result.rows[0];
    const token = generateToken(user);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.created_at
      },
      token
    };
};

const login = async (email, password) => {
  const result = await pool.query(
    `SELECT id, name, email, password_hash, created_at
     FROM users WHERE email = $1`,
    [email]
  );

  if (result.rows.length === 0) {
    throw new AuthenticationError('Invalid email or password');
  }

  const user = result.rows[0];
  const isValidPassword = await comparePassword(password, user.password_hash);

  if (!isValidPassword) {
    throw new AuthenticationError('Invalid email or password');
  }

  await pool.query(
    'UPDATE users SET last_login_at = NOW() WHERE id = $1',
    [user.id]
  );

  const token = generateToken(user);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.created_at
    },
    token
  };
};

const getProfile = async (userId) => {
  const result = await pool.query(
    `SELECT id, name, email, created_at, last_login_at
     FROM users WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new AppError('User not found', 404);
  }

  const user = result.rows[0];
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.created_at,
    lastLoginAt: user.last_login_at
  };
};

const getUserById = async (userId) => {
  const result = await pool.query(
    'SELECT id, email, name, created_at FROM users WHERE id = $1',
    [userId]
  );
  if (result.rows.length === 0) {
    throw new AuthenticationError('User not found');
  }
  return result.rows[0];
};

const logout = async (userId) => {
  // Token invalidation is handled client-side; server validates on each request
  return { message: 'Logged out successfully' };
};

module.exports = { register, login, getProfile, getUserById, logout, generateToken };
