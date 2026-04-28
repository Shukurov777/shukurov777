'use strict';

const { Router } = require('express');
const { query } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validate');
const { ytGet } = require('../utils/youtube');

const router = Router();

const VIDEO_PARTS = [
  'contentDetails',
  'id',
  'localizations',
  'player',
  'recordingDetails',
  'snippet',
  'statistics',
  'status',
  'topicDetails',
];

const validation = [
  query('id')
    .notEmpty()
    .withMessage('id is required — comma-separated video IDs'),

  query('part')
    .optional()
    .isString()
    .custom((val) => {
      const parts = val.split(',').map((v) => v.trim());
      for (const p of parts) {
        if (!VIDEO_PARTS.includes(p)) {
          throw new Error(`Unknown part "${p}". Valid parts: ${VIDEO_PARTS.join(', ')}`);
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
    .withMessage('hl must be a BCP-47 language code (e.g. en, ru)'),

  query('regionCode')
    .optional()
    .isLength({ min: 2, max: 2 })
    .isAlpha()
    .withMessage('regionCode must be a 2-letter ISO 3166-1 alpha-2 code'),
];

/**
 * @route   GET /api/videos
 * @desc    YouTube videos.list — get details for one or more video IDs
 *
 * Query parameters:
 *   id          (required)  – Comma-separated video IDs
 *   part        (optional)  – Comma-separated parts (default: snippet,statistics,contentDetails)
 *   hl          (optional)  – Language for localised fields (e.g. en, ru)
 *   regionCode  (optional)  – ISO 3166-1 alpha-2 country code
 */
router.get('/', validation, handleValidationErrors, async (req, res, next) => {
  try {
    const {
      id,
      part = 'snippet,statistics,contentDetails',
      hl,
      regionCode,
      maxResults,
      pageToken,
    } = req.query;

    const params = {
      part,
      id,
      ...(hl && { hl }),
      ...(regionCode && { regionCode: regionCode.toUpperCase() }),
      ...(maxResults && { maxResults: Number(maxResults) }),
      ...(pageToken && { pageToken }),
    };

    const data = await ytGet('videos', params);

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
