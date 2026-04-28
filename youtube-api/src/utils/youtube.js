'use strict';

const axios = require('axios');

const BASE_URL = 'https://www.googleapis.com/youtube/v3';

/**
 * Make a GET request to the YouTube Data API v3.
 * @param {string} resource  – API resource path, e.g. "search", "videos", "channels"
 * @param {object} params    – Query parameters (key is added automatically)
 * @returns {Promise<object>} – Parsed JSON response
 * @throws {Error} with `.status` and `.message` set from the YouTube error body
 */
async function ytGet(resource, params = {}) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    const err = new Error('YOUTUBE_API_KEY environment variable is not configured');
    err.status = 500;
    throw err;
  }

  try {
    const response = await axios.get(`${BASE_URL}/${resource}`, {
      params: { key: apiKey, ...params },
      timeout: 10000,
    });
    return response.data;
  } catch (err) {
    if (err.response) {
      // YouTube returned an error response
      const ytError = err.response.data && err.response.data.error;
      const message =
        (ytError && ytError.message) ||
        `YouTube API error: ${err.response.status} ${err.response.statusText}`;
      const apiErr = new Error(message);
      apiErr.status = err.response.status;
      apiErr.youtubeError = ytError || null;
      throw apiErr;
    }
    if (err.code === 'ECONNABORTED') {
      const timeoutErr = new Error('Request to YouTube API timed out');
      timeoutErr.status = 504;
      throw timeoutErr;
    }
    throw err;
  }
}

module.exports = { ytGet };
