'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const searchRouter = require('./routes/search');
const videosRouter = require('./routes/videos');
const channelsRouter = require('./routes/channels');
const playlistsRouter = require('./routes/playlists');
const featuredRouter = require('./routes/featured');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Health check ────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    name: 'YouTube API Wrapper',
    version: '1.0.0',
    docs: 'See README.md or /api-docs',
    endpoints: {
      search: '/api/search',
      videos: '/api/videos',
      channels: '/api/channels',
      playlists: '/api/playlists',
      featured: {
        top: '/api/featured/top',
        trending: '/api/featured/trending',
        bestOf: '/api/featured/best-of',
      },
    },
  });
});

// ── API routes ───────────────────────────────────────────────────────────────
app.use('/api/search', searchRouter);
app.use('/api/videos', videosRouter);
app.use('/api/channels', channelsRouter);
app.use('/api/playlists', playlistsRouter);
app.use('/api/featured', featuredRouter);

// ── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', message: `Route ${req.path} does not exist` });
});

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ── Start ────────────────────────────────────────────────────────────────────
if (!process.env.YOUTUBE_API_KEY) {
  console.warn(
    '[WARN] YOUTUBE_API_KEY is not set. All requests to YouTube will fail.\n' +
      '       Copy .env.example to .env and add your key.'
  );
}

app.listen(PORT, () => {
  console.log(`YouTube API server listening on http://localhost:${PORT}`);
});

module.exports = app;
