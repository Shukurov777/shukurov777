'use strict';

const { Router } = require('express');
const { query } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validate');
const { ytGet } = require('../utils/youtube');

const router = Router();

const CHANNEL_PARTS = [
  'auditDetails',
  'brandingSettings',
  'contentDetails',
  'contentOwnerDetails',
  'id',
  'localizations',
  'snippet',
  'statistics',
  'status',
  'topicDetails',
];

const validation = [
  query('id')
    .optional()
    .isString()
    .withMessage('id must be a comma-separated string of channel IDs'),

  query('forHandle')
    .optional()
    .isString()
    .withMessage('forHandle must be a channel handle (e.g. @MrBeast)'),

  query('forUsername')
    .optional()
    .isString()
    .withMessage('forUsername must be a legacy YouTube username'),

  query('part')
    .optional()
    .isString()
    .custom((val) => {
      const parts = val.split(',').map((v) => v.trim());
      for (const p of parts) {
        if (!CHANNEL_PARTS.includes(p)) {
          throw new Error(`Unknown part "${p}". Valid parts: ${CHANNEL_PARTS.join(', ')}`);
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
 * @route   GET /api/channels
 * @desc    YouTube channels.list — get channel details
 *
 * Query parameters (one of id / forHandle / forUsername is required):
 *   id           – Comma-separated channel IDs
 *   forHandle    – Channel handle (e.g. @MrBeast)
 *   forUsername  – Legacy YouTube username
 *   part         – Comma-separated parts (default: snippet,statistics,contentDetails)
 *   hl           – Language for localised strings
 *   maxResults   – 1–50
 *   pageToken    – Pagination token
 */
router.get('/', validation, handleValidationErrors, async (req, res, next) => {
  try {
    const {
      id,
      forHandle,
      forUsername,
      part = 'snippet,statistics,contentDetails',
      hl,
      maxResults,
      pageToken,
    } = req.query;

    if (!id && !forHandle && !forUsername) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'At least one of id, forHandle, or forUsername is required',
      });
    }

    const params = {
      part,
      ...(id && { id }),
      ...(forHandle && { forHandle }),
      ...(forUsername && { forUsername }),
      ...(hl && { hl }),
      ...(maxResults && { maxResults: Number(maxResults) }),
      ...(pageToken && { pageToken }),
    };

    const data = await ytGet('channels', params);

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
