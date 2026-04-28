'use strict';

/**
 * featured.js — convenience wrappers around search.list and videos.list
 *
 * Endpoints:
 *   GET /api/featured/top        – Top search results by query + country
 *   GET /api/featured/trending   – "Trending" videos (mostPopular chart via videos.list)
 *   GET /api/featured/best-of    – Best-of search: most viewed videos in a category/country
 *   GET /api/featured/live       – Currently live streams matching a topic/region
 *   GET /api/featured/upcoming   – Upcoming live events
 */

const { Router } = require('express');
const { query } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validate');
const { ytGet } = require('../utils/youtube');

const router = Router();

// ── Shared helpers ────────────────────────────────────────────────────────────
const regionValidation = query('regionCode')
  .optional()
  .isLength({ min: 2, max: 2 })
  .isAlpha()
  .withMessage('regionCode must be a 2-letter ISO 3166-1 alpha-2 code (e.g. US, RU, UZ)');

const maxResultsValidation = query('maxResults')
  .optional()
  .isInt({ min: 1, max: 50 })
  .withMessage('maxResults must be between 1 and 50');

// ── GET /api/featured/top ─────────────────────────────────────────────────────
/**
 * @route   GET /api/featured/top
 * @desc    Top search results filtered by region, language, and category.
 *          Returns search results sorted by relevance; optionally enriched
 *          with full video details (statistics, contentDetails).
 *
 * Query params:
 *   q                 – Search query (default: "")
 *   regionCode        – ISO 3166-1 alpha-2 (e.g. UZ, RU, US, DE)
 *   relevanceLanguage – BCP-47 (e.g. uz, ru, en)
 *   videoCategoryId   – YouTube category ID
 *   order             – relevance|date|viewCount|rating (default: relevance)
 *   maxResults        – 1–50 (default: 10)
 *   enrich            – true to fetch video details (statistics, etc.)
 */
router.get(
  '/top',
  [
    query('q').optional().isString().trim(),
    regionValidation,
    query('relevanceLanguage').optional().isString(),
    query('videoCategoryId').optional().isString(),
    query('order')
      .optional()
      .isIn(['relevance', 'date', 'viewCount', 'rating', 'title'])
      .withMessage('order must be one of: relevance, date, viewCount, rating, title'),
    maxResultsValidation,
    query('enrich').optional().isBoolean().withMessage('enrich must be true or false'),
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const {
        q = '',
        regionCode,
        relevanceLanguage,
        videoCategoryId,
        order = 'relevance',
        maxResults = 10,
        enrich = 'false',
      } = req.query;

      const searchParams = {
        part: 'snippet',
        type: 'video',
        order,
        maxResults: Number(maxResults),
        ...(q && { q }),
        ...(regionCode && { regionCode: regionCode.toUpperCase() }),
        ...(relevanceLanguage && { relevanceLanguage }),
        ...(videoCategoryId && { videoCategoryId }),
      };

      const searchData = await ytGet('search', searchParams);
      const items = searchData.items || [];

      let enrichedItems = items;

      if (enrich === 'true' && items.length > 0) {
        const ids = items.map((i) => i.id && i.id.videoId).filter(Boolean).join(',');
        if (ids) {
          const videoData = await ytGet('videos', {
            part: 'snippet,statistics,contentDetails,status',
            id: ids,
          });
          const videoMap = {};
          for (const v of videoData.items || []) {
            videoMap[v.id] = v;
          }
          enrichedItems = items.map((item) => ({
            ...item,
            details: item.id && item.id.videoId ? videoMap[item.id.videoId] || null : null,
          }));
        }
      }

      res.json({
        kind: 'youtube#featuredTop',
        regionCode: (regionCode && regionCode.toUpperCase()) || null,
        nextPageToken: searchData.nextPageToken || null,
        prevPageToken: searchData.prevPageToken || null,
        pageInfo: searchData.pageInfo,
        items: enrichedItems,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/featured/trending ────────────────────────────────────────────────
/**
 * @route   GET /api/featured/trending
 * @desc    Trending / most popular videos for a given country using the
 *          videos.list mostPopular chart.
 *
 * Query params:
 *   regionCode       – ISO 3166-1 alpha-2 (default: US)
 *   videoCategoryId  – YouTube category ID (optional)
 *   hl               – Language for snippets (e.g. en, ru)
 *   maxResults       – 1–50 (default: 10)
 *   pageToken        – Pagination token
 */
router.get(
  '/trending',
  [
    regionValidation,
    maxResultsValidation,
    query('videoCategoryId').optional().isString(),
    query('hl').optional().isString(),
    query('pageToken').optional().isString(),
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const {
        regionCode = 'US',
        videoCategoryId,
        hl,
        maxResults = 10,
        pageToken,
      } = req.query;

      const params = {
        part: 'snippet,statistics,contentDetails,status',
        chart: 'mostPopular',
        regionCode: regionCode.toUpperCase(),
        maxResults: Number(maxResults),
        ...(videoCategoryId && { videoCategoryId }),
        ...(hl && { hl }),
        ...(pageToken && { pageToken }),
      };

      const data = await ytGet('videos', params);

      res.json({
        kind: 'youtube#featuredTrending',
        regionCode: regionCode.toUpperCase(),
        nextPageToken: data.nextPageToken || null,
        prevPageToken: data.prevPageToken || null,
        pageInfo: data.pageInfo,
        items: data.items || [],
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/featured/best-of ─────────────────────────────────────────────────
/**
 * @route   GET /api/featured/best-of
 * @desc    Best-of: search for top-rated (highest-view) videos in a
 *          category/country sorted by viewCount, enriched with statistics.
 *
 * Query params:
 *   q                 – Search query
 *   regionCode        – ISO 3166-1 alpha-2
 *   relevanceLanguage – BCP-47
 *   videoCategoryId   – YouTube category ID
 *   videoDuration     – any|long|medium|short
 *   publishedAfter    – ISO 8601
 *   publishedBefore   – ISO 8601
 *   maxResults        – 1–50 (default: 10)
 */
router.get(
  '/best-of',
  [
    query('q').optional().isString().trim(),
    regionValidation,
    query('relevanceLanguage').optional().isString(),
    query('videoCategoryId').optional().isString(),
    query('videoDuration')
      .optional()
      .isIn(['any', 'long', 'medium', 'short'])
      .withMessage('videoDuration must be any|long|medium|short'),
    query('publishedAfter').optional().isISO8601(),
    query('publishedBefore').optional().isISO8601(),
    maxResultsValidation,
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const {
        q,
        regionCode,
        relevanceLanguage,
        videoCategoryId,
        videoDuration,
        publishedAfter,
        publishedBefore,
        maxResults = 10,
      } = req.query;

      // Search sorted by viewCount
      const searchParams = {
        part: 'snippet',
        type: 'video',
        order: 'viewCount',
        maxResults: Number(maxResults),
        ...(q && { q }),
        ...(regionCode && { regionCode: regionCode.toUpperCase() }),
        ...(relevanceLanguage && { relevanceLanguage }),
        ...(videoCategoryId && { videoCategoryId }),
        ...(videoDuration && { videoDuration }),
        ...(publishedAfter && { publishedAfter }),
        ...(publishedBefore && { publishedBefore }),
      };

      const searchData = await ytGet('search', searchParams);
      const items = searchData.items || [];

      // Enrich with full video details
      let enrichedItems = items;
      if (items.length > 0) {
        const ids = items.map((i) => i.id && i.id.videoId).filter(Boolean).join(',');
        if (ids) {
          const videoData = await ytGet('videos', {
            part: 'snippet,statistics,contentDetails',
            id: ids,
          });
          const videoMap = {};
          for (const v of videoData.items || []) {
            videoMap[v.id] = v;
          }
          enrichedItems = items.map((item) => ({
            ...item,
            details: item.id && item.id.videoId ? videoMap[item.id.videoId] || null : null,
          }));
        }
      }

      res.json({
        kind: 'youtube#featuredBestOf',
        regionCode: (regionCode && regionCode.toUpperCase()) || null,
        nextPageToken: searchData.nextPageToken || null,
        prevPageToken: searchData.prevPageToken || null,
        pageInfo: searchData.pageInfo,
        items: enrichedItems,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/featured/live ────────────────────────────────────────────────────
/**
 * @route   GET /api/featured/live
 * @desc    Currently live streams, optionally filtered by query/region/topic.
 *
 * Query params:
 *   q           – Topic/keyword
 *   regionCode  – ISO 3166-1 alpha-2
 *   maxResults  – 1–50 (default: 10)
 *   order       – relevance|date|viewCount|rating (default: viewCount)
 */
router.get(
  '/live',
  [
    query('q').optional().isString().trim(),
    regionValidation,
    maxResultsValidation,
    query('order')
      .optional()
      .isIn(['relevance', 'date', 'viewCount', 'rating'])
      .withMessage('order must be one of: relevance, date, viewCount, rating'),
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { q, regionCode, maxResults = 10, order = 'viewCount' } = req.query;

      const params = {
        part: 'snippet',
        type: 'video',
        eventType: 'live',
        order,
        maxResults: Number(maxResults),
        ...(q && { q }),
        ...(regionCode && { regionCode: regionCode.toUpperCase() }),
      };

      const data = await ytGet('search', params);

      res.json({
        kind: 'youtube#featuredLive',
        regionCode: (regionCode && regionCode.toUpperCase()) || null,
        nextPageToken: data.nextPageToken || null,
        prevPageToken: data.prevPageToken || null,
        pageInfo: data.pageInfo,
        items: data.items || [],
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/featured/upcoming ────────────────────────────────────────────────
/**
 * @route   GET /api/featured/upcoming
 * @desc    Upcoming live events.
 *
 * Query params:
 *   q           – Topic/keyword
 *   regionCode  – ISO 3166-1 alpha-2
 *   maxResults  – 1–50 (default: 10)
 *   order       – relevance|date (default: date)
 */
router.get(
  '/upcoming',
  [
    query('q').optional().isString().trim(),
    regionValidation,
    maxResultsValidation,
    query('order')
      .optional()
      .isIn(['relevance', 'date', 'viewCount', 'rating'])
      .withMessage('order must be one of: relevance, date, viewCount, rating'),
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { q, regionCode, maxResults = 10, order = 'date' } = req.query;

      const params = {
        part: 'snippet',
        type: 'video',
        eventType: 'upcoming',
        order,
        maxResults: Number(maxResults),
        ...(q && { q }),
        ...(regionCode && { regionCode: regionCode.toUpperCase() }),
      };

      const data = await ytGet('search', params);

      res.json({
        kind: 'youtube#featuredUpcoming',
        regionCode: (regionCode && regionCode.toUpperCase()) || null,
        nextPageToken: data.nextPageToken || null,
        prevPageToken: data.prevPageToken || null,
        pageInfo: data.pageInfo,
        items: data.items || [],
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
