'use strict';

const { Router } = require('express');
const { query } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validate');
const { ytGet } = require('../utils/youtube');

const router = Router();

const PLAYLIST_PARTS = [
  'contentDetails',
  'id',
  'localizations',
  'player',
  'snippet',
  'status',
];

const PLAYLIST_ITEMS_PARTS = [
  'contentDetails',
  'id',
  'snippet',
  'status',
];

const validation = [
  query('id')
    .optional()
    .isString()
    .withMessage('id must be a comma-separated string of playlist IDs'),

  query('channelId')
    .optional()
    .isString()
    .withMessage('channelId must be a channel ID string'),

  query('part')
    .optional()
    .isString()
    .custom((val) => {
      const parts = val.split(',').map((v) => v.trim());
      for (const p of parts) {
        if (!PLAYLIST_PARTS.includes(p)) {
          throw new Error(`Unknown part "${p}". Valid parts: ${PLAYLIST_PARTS.join(', ')}`);
        }
      }
      return true;
    }),

  query('maxResults')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('maxResults must be between 1 and 50'),

  query('pageToken').optional().isString(),

  query('hl')
    .optional()
    .isString()
    .withMessage('hl must be a BCP-47 language code'),
];

/**
 * @route   GET /api/playlists
 * @desc    YouTube playlists.list — get playlist metadata
 *
 * Query parameters (one of id / channelId is required):
 *   id          – Comma-separated playlist IDs
 *   channelId   – Return playlists owned by this channel
 *   part        – Comma-separated parts (default: snippet,contentDetails,status)
 *   hl          – Language for localised strings
 *   maxResults  – 1–50
 *   pageToken   – Pagination token
 */
router.get('/', validation, handleValidationErrors, async (req, res, next) => {
  try {
    const {
      id,
      channelId,
      part = 'snippet,contentDetails,status',
      hl,
      maxResults = 10,
      pageToken,
    } = req.query;

    if (!id && !channelId) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'At least one of id or channelId is required',
      });
    }

    const params = {
      part,
      maxResults: Number(maxResults),
      ...(id && { id }),
      ...(channelId && { channelId }),
      ...(hl && { hl }),
      ...(pageToken && { pageToken }),
    };

    const data = await ytGet('playlists', params);

    res.json({
      kind: data.kind,
      etag: data.etag,
      nextPageToken: data.nextPageToken || null,
      prevPageToken: data.prevPageToken || null,
      pageInfo: data.pageInfo,
      items: data.items || [],
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/playlists/items ──────────────────────────────────────────────────
const itemsValidation = [
  query('playlistId')
    .notEmpty()
    .withMessage('playlistId is required'),

  query('part')
    .optional()
    .isString()
    .custom((val) => {
      const parts = val.split(',').map((v) => v.trim());
      for (const p of parts) {
        if (!PLAYLIST_ITEMS_PARTS.includes(p)) {
          throw new Error(`Unknown part "${p}". Valid parts: ${PLAYLIST_ITEMS_PARTS.join(', ')}`);
        }
      }
      return true;
    }),

  query('maxResults')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('maxResults must be between 1 and 50'),

  query('pageToken').optional().isString(),
];

/**
 * @route   GET /api/playlists/items
 * @desc    YouTube playlistItems.list — get videos inside a playlist
 *
 * Query parameters:
 *   playlistId  (required)  – Playlist ID
 *   part        (optional)  – Comma-separated parts (default: snippet,contentDetails)
 *   maxResults  (optional)  – 1–50 (default: 10)
 *   pageToken   (optional)  – Pagination token
 */
router.get('/items', itemsValidation, handleValidationErrors, async (req, res, next) => {
  try {
    const {
      playlistId,
      part = 'snippet,contentDetails',
      maxResults = 10,
      pageToken,
    } = req.query;

    const params = {
      part,
      playlistId,
      maxResults: Number(maxResults),
      ...(pageToken && { pageToken }),
    };

    const data = await ytGet('playlistItems', params);

    res.json({
      kind: data.kind,
      etag: data.etag,
      nextPageToken: data.nextPageToken || null,
      prevPageToken: data.prevPageToken || null,
      pageInfo: data.pageInfo,
      items: data.items || [],
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
