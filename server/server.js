require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import routes
const ttsRoutes = require('./routes/tts');
const voiceRoutes = require('./routes/voices');
const authRoutes = require('./routes/auth');
const historyRoutes = require('./routes/history');
const favoritesRoutes = require('./routes/favorites');
const preferencesRoutes = require('./routes/preferences');
const healthRoutes = require('./routes/health');

// Import error handler
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Serve static audio files
app.use('/audio', express.static(path.join(__dirname, 'audio')));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

// Health check (no rate limit)
app.use('/api/health', healthRoutes);

// API routes
app.use('/api/tts', ttsRoutes);
app.use('/api/voices', voiceRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/preferences', preferencesRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.originalUrl}`,
    hint: 'If this looks like a route that should exist, an older server process may still be holding this port. Check with: lsof -ti:5000',
  });
});

// Error handler
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`Voxora server running on http://localhost:${PORT}`);
    console.log(`Environment:  ${process.env.NODE_ENV || 'development'}`);
    console.log(`TTS provider: ${require('./services/ttsService').getProviderName()}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `\nPort ${PORT} is already in use, so this server did NOT start.\n` +
        `Something older is answering on it, which is why routes look missing.\n\n` +
        `  Free it:  lsof -ti:${PORT} | xargs kill -9\n` +
        `  Or pick another port:  PORT=5001 npm run dev\n\n` +
        `On macOS, port 5000 is also used by AirPlay Receiver\n` +
        `(System Settings > General > AirDrop & Handoff).\n`
      );
      process.exit(1);
    }
    throw err;
  });
}

module.exports = app;
