const { body } = require('express-validator');

const registerValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required.')
    .isLength({ max: 100 })
    .withMessage('Name must not exceed 100 characters.'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required.')
    .isEmail()
    .withMessage('Invalid email address.')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required.')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters.')
    .matches(/[a-z]/)
    .withMessage('Password must contain a lowercase letter.')
    .matches(/[A-Z]/)
    .withMessage('Password must contain an uppercase letter.')
    .matches(/\d/)
    .withMessage('Password must contain a number.'),
  body('confirmPassword')
    .notEmpty()
    .withMessage('Please confirm your password.')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match.');
      }
      return true;
    })
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required.')
    .isEmail()
    .withMessage('Invalid email address.')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required.')
];

const speechHistoryValidation = [
  body('text')
    .trim()
    .notEmpty()
    .withMessage('Text is required.')
    .isLength({ max: 5000 })
    .withMessage('Text must not exceed 5000 characters.'),
  body('languageCode')
    .trim()
    .notEmpty()
    .withMessage('Language code is required.'),
  body('voiceId')
    .trim()
    .notEmpty()
    .withMessage('Voice ID is required.'),
  body('characterCount')
    .isInt({ min: 1 })
    .withMessage('Character count must be a positive integer.'),
  body('wordCount')
    .isInt({ min: 1 })
    .withMessage('Word count must be a positive integer.')
];

module.exports = {
  registerValidation,
  loginValidation,
  speechHistoryValidation
};
