'use strict';

const { Router } = require('express');
const { query } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validate');
const { ytGet } = require('../utils/youtube');

const router = Router();

// ── Allowed enum values ───────────────────────────────────────────────────────
const TYPES = ['video', 'channel', 'playlist'];
const ORDER = ['date', 'rating', 'relevance', 'title', 'videoCount', 'viewCount'];
const DURATION = ['any', 'long', 'medium', 'short'];
const DEFINITION = ['any', 'high', 'standard'];
const DIMENSION = ['2d', '3d'];
const EMBEDDABLE = ['any', 'true'];
const SYNDICATED = ['any', 'true'];
const VIDEO_TYPE = ['any', 'episode', 'movie'];
const CAPTION = ['any', 'closedCaption', 'none'];
const SAFE_SEARCH = ['moderate', 'none', 'strict'];
const EVENT_TYPE = ['completed', 'live', 'upcoming'];
const CHANNEL_TYPE = ['any', 'show'];
const LICENSE = ['any', 'creativeCommon', 'youtube'];

// ── Validation rules ──────────────────────────────────────────────────────────
const searchValidation = [
  query('q').optional().isString().trim().notEmpty().withMessage('q must be a non-empty string'),

  query('part')
    .optional()
    .isString()
    .withMessage('part must be a comma-separated string (e.g. snippet,id)'),

  query('type')
    .optional()
    .custom((val) => {
      const parts = val.split(',').map((v) => v.trim());
      for (const p of parts) {
        if (!TYPES.includes(p)) {
          throw new Error(`type must be one of: ${TYPES.join(', ')}`);
        }
      }
      return true;
    }),

  query('order')
    .optional()
    .isIn(ORDER)
    .withMessage(`order must be one of: ${ORDER.join(', ')}`),

  query('maxResults')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('maxResults must be an integer between 1 and 50'),

  query('pageToken').optional().isString().withMessage('pageToken must be a string'),

  query('regionCode')
    .optional()
    .isLength({ min: 2, max: 2 })
    .isAlpha()
    .withMessage('regionCode must be a 2-letter ISO 3166-1 alpha-2 country code (e.g. US, RU, UZ)'),

  query('relevanceLanguage')
    .optional()
    .isString()
    .withMessage('relevanceLanguage must be a BCP-47 language code (e.g. en, ru, uz)'),

  query('channelId').optional().isString().withMessage('channelId must be a string'),

  query('channelType')
    .optional()
    .isIn(CHANNEL_TYPE)
    .withMessage(`channelType must be one of: ${CHANNEL_TYPE.join(', ')}`),

  query('publishedAfter')
    .optional()
    .isISO8601()
    .withMessage('publishedAfter must be an ISO 8601 datetime (e.g. 2024-01-01T00:00:00Z)'),

  query('publishedBefore')
    .optional()
    .isISO8601()
    .withMessage('publishedBefore must be an ISO 8601 datetime (e.g. 2024-12-31T23:59:59Z)'),

  query('videoDuration')
    .optional()
    .isIn(DURATION)
    .withMessage(`videoDuration must be one of: ${DURATION.join(', ')}`),

  query('videoDefinition')
    .optional()
    .isIn(DEFINITION)
    .withMessage(`videoDefinition must be one of: ${DEFINITION.join(', ')}`),

  query('videoDimension')
    .optional()
    .isIn(DIMENSION)
    .withMessage(`videoDimension must be one of: ${DIMENSION.join(', ')}`),

  query('videoEmbeddable')
    .optional()
    .isIn(EMBEDDABLE)
    .withMessage(`videoEmbeddable must be one of: ${EMBEDDABLE.join(', ')}`),

  query('videoSyndicated')
    .optional()
    .isIn(SYNDICATED)
    .withMessage(`videoSyndicated must be one of: ${SYNDICATED.join(', ')}`),

  query('videoType')
    .optional()
    .isIn(VIDEO_TYPE)
    .withMessage(`videoType must be one of: ${VIDEO_TYPE.join(', ')}`),

  query('videoCaption')
    .optional()
    .isIn(CAPTION)
    .withMessage(`videoCaption must be one of: ${CAPTION.join(', ')}`),

  query('videoCategoryId').optional().isString().withMessage('videoCategoryId must be a string'),

  query('videoLicense')
    .optional()
    .isIn(LICENSE)
    .withMessage(`videoLicense must be one of: ${LICENSE.join(', ')}`),

  query('safeSearch')
    .optional()
    .isIn(SAFE_SEARCH)
    .withMessage(`safeSearch must be one of: ${SAFE_SEARCH.join(', ')}`),

  query('topicId').optional().isString().withMessage('topicId must be a string'),

  query('eventType')
    .optional()
    .isIn(EVENT_TYPE)
    .withMessage(`eventType must be one of: ${EVENT_TYPE.join(', ')}`),

  query('location')
    .optional()
    .matches(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/)
    .withMessage('location must be in "latitude,longitude" format (e.g. 37.42307,-122.08427)'),

  query('locationRadius')
    .optional()
    .matches(/^\d+(\.\d+)?(m|km|ft|mi)$/)
    .withMessage('locationRadius must include a unit: m, km, ft, or mi (e.g. 10km, 50mi)'),

  query('forMine')
    .optional()
    .isBoolean()
    .withMessage('forMine must be true or false (requires OAuth)'),

  query('forDeveloper')
    .optional()
    .isBoolean()
    .withMessage('forDeveloper must be true or false'),
];

// ── GET /api/search ───────────────────────────────────────────────────────────
/**
 * @route   GET /api/search
 * @desc    Full YouTube Data API v3 search.list with all supported parameters
 *
 * Query parameters (all optional except at least one filter is recommended):
 *   q                  – Search query string
 *   part               – Comma-separated resource parts (default: snippet)
 *   type               – Comma-separated: video,channel,playlist (default: video,channel,playlist)
 *   order              – date|rating|relevance|title|videoCount|viewCount (default: relevance)
 *   maxResults         – 1–50 (default: 10)
 *   pageToken          – Next/prev page token
 *   regionCode         – ISO 3166-1 alpha-2 (e.g. US, RU, UZ)
 *   relevanceLanguage  – BCP-47 (e.g. en, ru, uz)
 *   channelId          – Restrict to channel
 *   channelType        – any|show
 *   publishedAfter     – ISO 8601 datetime
 *   publishedBefore    – ISO 8601 datetime
 *   videoDuration      – any|long|medium|short
 *   videoDefinition    – any|high|standard
 *   videoDimension     – 2d|3d
 *   videoEmbeddable    – any|true
 *   videoSyndicated    – any|true
 *   videoType          – any|episode|movie
 *   videoCaption       – any|closedCaption|none
 *   videoCategoryId    – YouTube category ID
 *   videoLicense       – any|creativeCommon|youtube
 *   safeSearch         – moderate|none|strict
 *   topicId            – Freebase topic ID
 *   eventType          – completed|live|upcoming
 *   location           – "lat,lng" (e.g. 41.2995,69.2401)
 *   locationRadius     – e.g. 10km, 50mi
 */
router.get('/', searchValidation, handleValidationErrors, async (req, res, next) => {
  try {
    const {
      q,
      part = 'snippet',
      type,
      order,
      maxResults = 10,
      pageToken,
      regionCode,
      relevanceLanguage,
      channelId,
      channelType,
      publishedAfter,
      publishedBefore,
      videoDuration,
      videoDefinition,
      videoDimension,
      videoEmbeddable,
      videoSyndicated,
      videoType,
      videoCaption,
      videoCategoryId,
      videoLicense,
      safeSearch,
      topicId,
      eventType,
      location,
      locationRadius,
      forMine,
      forDeveloper,
    } = req.query;

    // Build params — only include defined values
    const params = {
      part,
      maxResults: Number(maxResults),
      ...(q && { q }),
      ...(type && { type }),
      ...(order && { order }),
      ...(pageToken && { pageToken }),
      ...(regionCode && { regionCode: regionCode.toUpperCase() }),
      ...(relevanceLanguage && { relevanceLanguage }),
      ...(channelId && { channelId }),
      ...(channelType && { channelType }),
      ...(publishedAfter && { publishedAfter }),
      ...(publishedBefore && { publishedBefore }),
      ...(videoDuration && { videoDuration }),
      ...(videoDefinition && { videoDefinition }),
      ...(videoDimension && { videoDimension }),
      ...(videoEmbeddable && { videoEmbeddable }),
      ...(videoSyndicated && { videoSyndicated }),
      ...(videoType && { videoType }),
      ...(videoCaption && { videoCaption }),
      ...(videoCategoryId && { videoCategoryId }),
      ...(videoLicense && { videoLicense }),
      ...(safeSearch && { safeSearch }),
      ...(topicId && { topicId }),
      ...(eventType && { eventType }),
      ...(location && { location }),
      ...(locationRadius && { locationRadius }),
      ...(forMine !== undefined && { forMine }),
      ...(forDeveloper !== undefined && { forDeveloper }),
    };

    const data = await ytGet('search', params);

    res.json({
      kind: data.kind,
      etag: data.etag,
      nextPageToken: data.nextPageToken || null,
      prevPageToken: data.prevPageToken || null,
      regionCode: data.regionCode || null,
      pageInfo: data.pageInfo,
      items: data.items || [],
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
