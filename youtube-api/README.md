# 🎬 YouTube API — Maximum Wrapper

> Full-featured **Node.js / Express** wrapper around the **YouTube Data API v3**.  
> Covers every `search.list` parameter, enrichment endpoints, trending charts, live streams and more.

---

## 📑 Table of Contents

1. [Features](#features)
2. [Requirements](#requirements)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Running](#running)
6. [API Reference](#api-reference)
   - [GET /api/search](#get-apisearch)
   - [GET /api/videos](#get-apivideos)
   - [GET /api/channels](#get-apichannels)
   - [GET /api/playlists](#get-apiplaylists)
   - [GET /api/playlists/items](#get-apiplaylistsitems)
   - [GET /api/featured/top](#get-apifeaturedtop)
   - [GET /api/featured/trending](#get-apifeaturedtrending)
   - [GET /api/featured/best-of](#get-apifeatured-best-of)
   - [GET /api/featured/live](#get-apifeaturedlive)
   - [GET /api/featured/upcoming](#get-apifeaturedupcoming)
7. [Parameter Tables](#parameter-tables)
   - [Search Parameters](#search-parameters-full)
   - [Country Codes](#country-codes)
   - [Video Category IDs](#video-category-ids)
8. [Example Requests & Responses](#example-requests--responses)
9. [Error Handling](#error-handling)
10. [Environment Variables](#environment-variables)

---

## Features

| Feature | Details |
|---------|---------|
| 🔍 Full search | All 25+ `search.list` parameters |
| 🌍 Region support | Filter by any ISO 3166-1 alpha-2 country code |
| 🗣️ Language support | `relevanceLanguage` (BCP-47) |
| 📺 Type filters | `video`, `channel`, `playlist` |
| ⏱️ Duration filters | `short` / `medium` / `long` |
| 📅 Date range | `publishedAfter` / `publishedBefore` |
| 📡 Live streams | Live & upcoming event filters |
| 📍 Geo search | `location` + `locationRadius` |
| 📈 Trending | `mostPopular` chart via `videos.list` |
| 🏆 Best-of | Search by viewCount + statistics enrichment |
| ✅ Validation | All params validated with meaningful errors |
| 🔑 Secure | API key via env var — never in code |

---

## Requirements

- **Node.js** ≥ 18
- A **YouTube Data API v3** key from [Google Cloud Console](https://console.cloud.google.com/)
- `npm` or `yarn`

---

## Installation

```bash
# 1. Enter the youtube-api directory
cd youtube-api

# 2. Install dependencies
npm install

# 3. Copy the example env file
cp .env.example .env

# 4. Add your YouTube API key to .env
#    (open .env and set YOUTUBE_API_KEY=YOUR_KEY)
```

### Getting a YouTube Data API v3 Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Navigate to **APIs & Services → Library**
4. Search for **"YouTube Data API v3"** and enable it
5. Go to **APIs & Services → Credentials → Create Credentials → API key**
6. Copy the key and paste it into your `.env` file

---

## Configuration

Create a `.env` file in the `youtube-api/` directory (copy from `.env.example`):

```dotenv
YOUTUBE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
PORT=3000
```

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `YOUTUBE_API_KEY` | ✅ Yes | — | Your YouTube Data API v3 key |
| `PORT` | No | `3000` | TCP port the server listens on |

> ⚠️ **Never commit your `.env` file or API key to the repository.**  
> The `.gitignore` already excludes `.env`.

---

## Running

```bash
# Production
npm start

# Development (auto-reload via nodemon)
npm run dev
```

The server starts at `http://localhost:3000` (or your `PORT`).

Health check:
```bash
curl http://localhost:3000/
```

---

## API Reference

All endpoints are prefixed with `/api`.  
All parameters are **query string** parameters.

---

### GET /api/search

Full YouTube `search.list` with every supported parameter.

```
GET /api/search?q=cats&regionCode=US&type=video&order=viewCount&maxResults=5
```

#### Complete Parameter Table {#search-parameters-full}

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `q` | string | — | Search query string |
| `part` | string | `snippet` | Comma-separated resource parts (e.g. `snippet`) |
| `type` | string | `video,channel,playlist` | Comma-separated: `video`, `channel`, `playlist` |
| `order` | string | `relevance` | `date` \| `rating` \| `relevance` \| `title` \| `videoCount` \| `viewCount` |
| `maxResults` | integer | `10` | Number of results (1–50) |
| `pageToken` | string | — | Token for next/previous page |
| `regionCode` | string | — | ISO 3166-1 alpha-2 country code (e.g. `US`, `RU`, `UZ`, `DE`) |
| `relevanceLanguage` | string | — | BCP-47 language code (e.g. `en`, `ru`, `uz`, `de`) |
| `channelId` | string | — | Restrict results to a specific channel |
| `channelType` | string | — | `any` \| `show` |
| `publishedAfter` | ISO 8601 | — | Return only results published after this datetime |
| `publishedBefore` | ISO 8601 | — | Return only results published before this datetime |
| `videoDuration` | string | — | `any` \| `short` (<4 min) \| `medium` (4–20 min) \| `long` (>20 min) |
| `videoDefinition` | string | — | `any` \| `high` (HD) \| `standard` (SD) |
| `videoDimension` | string | — | `2d` \| `3d` |
| `videoEmbeddable` | string | — | `any` \| `true` (only embeddable videos) |
| `videoSyndicated` | string | — | `any` \| `true` (only syndicated outside youtube.com) |
| `videoType` | string | — | `any` \| `episode` \| `movie` |
| `videoCaption` | string | — | `any` \| `closedCaption` \| `none` |
| `videoCategoryId` | string | — | YouTube category ID (see [Video Category IDs](#video-category-ids)) |
| `videoLicense` | string | — | `any` \| `creativeCommon` \| `youtube` |
| `safeSearch` | string | — | `moderate` \| `none` \| `strict` |
| `topicId` | string | — | Freebase topic ID (e.g. `/m/04rlf` for Music) |
| `eventType` | string | — | `completed` \| `live` \| `upcoming` |
| `location` | string | — | Geo-coordinates: `"lat,lng"` (e.g. `41.2995,69.2401` for Tashkent) |
| `locationRadius` | string | — | Radius with unit: `10km`, `50mi`, `1000m`, `500ft` |

---

### GET /api/videos

Fetch full details for one or more video IDs (`videos.list`).

```
GET /api/videos?id=dQw4w9WgXcQ,9bZkp7q19f0&part=snippet,statistics,contentDetails
```

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `id` | ✅ Yes | — | Comma-separated video IDs |
| `part` | No | `snippet,statistics,contentDetails` | Resource parts |
| `hl` | No | — | Language for localised fields (e.g. `en`, `ru`) |
| `regionCode` | No | — | ISO 3166-1 alpha-2 country code |
| `maxResults` | No | — | 1–50 |
| `pageToken` | No | — | Pagination token |

Available `part` values: `contentDetails`, `id`, `localizations`, `player`, `recordingDetails`, `snippet`, `statistics`, `status`, `topicDetails`

---

### GET /api/channels

Fetch channel details (`channels.list`).

```
GET /api/channels?forHandle=@MrBeast&part=snippet,statistics
```

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `id` | One of these | — | Comma-separated channel IDs |
| `forHandle` | One of these | — | Channel handle (e.g. `@MrBeast`) |
| `forUsername` | One of these | — | Legacy YouTube username |
| `part` | No | `snippet,statistics,contentDetails` | Resource parts |
| `hl` | No | — | Language for localised fields |
| `maxResults` | No | — | 1–50 |
| `pageToken` | No | — | Pagination token |

Available `part` values: `auditDetails`, `brandingSettings`, `contentDetails`, `id`, `localizations`, `snippet`, `statistics`, `status`, `topicDetails`

---

### GET /api/playlists

Fetch playlist metadata (`playlists.list`).

```
GET /api/playlists?channelId=UCX6OQ3DkcsbYNE6H8uQQuVA&maxResults=10
```

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `id` | One of these | — | Comma-separated playlist IDs |
| `channelId` | One of these | — | Channel ID to list playlists for |
| `part` | No | `snippet,contentDetails,status` | Resource parts |
| `hl` | No | — | Language |
| `maxResults` | No | `10` | 1–50 |
| `pageToken` | No | — | Pagination token |

---

### GET /api/playlists/items

Fetch videos inside a playlist (`playlistItems.list`).

```
GET /api/playlists/items?playlistId=PLbpi6ZahtOH6Ar_3GPy3workS_3RJyBiD&maxResults=20
```

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `playlistId` | ✅ Yes | — | Playlist ID |
| `part` | No | `snippet,contentDetails` | Resource parts (`contentDetails`, `id`, `snippet`, `status`) |
| `maxResults` | No | `10` | 1–50 |
| `pageToken` | No | — | Pagination token |

---

### GET /api/featured/top

Top results for a query in a given country, optionally enriched with video statistics.

```
GET /api/featured/top?q=football&regionCode=UZ&order=viewCount&maxResults=5&enrich=true
```

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `q` | No | `""` | Search query |
| `regionCode` | No | — | ISO 3166-1 alpha-2 (e.g. `UZ`, `RU`, `US`) |
| `relevanceLanguage` | No | — | BCP-47 language code |
| `videoCategoryId` | No | — | Category ID |
| `order` | No | `relevance` | `relevance` \| `date` \| `viewCount` \| `rating` \| `title` |
| `maxResults` | No | `10` | 1–50 |
| `enrich` | No | `false` | If `true`, fetches full video statistics for each result |

---

### GET /api/featured/trending

"Trending" / most popular videos for a country using the official `mostPopular` chart.

```
GET /api/featured/trending?regionCode=RU&maxResults=10
```

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `regionCode` | No | `US` | ISO 3166-1 alpha-2 country code |
| `videoCategoryId` | No | — | Restrict to a category |
| `hl` | No | — | Language for snippets |
| `maxResults` | No | `10` | 1–50 |
| `pageToken` | No | — | Pagination token |

---

### GET /api/featured/best-of {#get-apifeatured-best-of}

Best-of wrapper: searches by `viewCount` (descending) and enriches each result with full `statistics` + `contentDetails`.

```
GET /api/featured/best-of?q=music&regionCode=DE&videoDuration=long&maxResults=5
```

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `q` | No | — | Search query |
| `regionCode` | No | — | ISO 3166-1 alpha-2 |
| `relevanceLanguage` | No | — | BCP-47 |
| `videoCategoryId` | No | — | Category ID |
| `videoDuration` | No | — | `any` \| `short` \| `medium` \| `long` |
| `publishedAfter` | No | — | ISO 8601 |
| `publishedBefore` | No | — | ISO 8601 |
| `maxResults` | No | `10` | 1–50 |

---

### GET /api/featured/live

Currently live streams, optionally filtered by query or region.

```
GET /api/featured/live?q=gaming&regionCode=US&order=viewCount&maxResults=10
```

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `q` | No | — | Keyword/topic |
| `regionCode` | No | — | ISO 3166-1 alpha-2 |
| `order` | No | `viewCount` | `relevance` \| `date` \| `viewCount` \| `rating` |
| `maxResults` | No | `10` | 1–50 |

---

### GET /api/featured/upcoming

Upcoming live events.

```
GET /api/featured/upcoming?q=concert&regionCode=GB&maxResults=5
```

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `q` | No | — | Keyword/topic |
| `regionCode` | No | — | ISO 3166-1 alpha-2 |
| `order` | No | `date` | `relevance` \| `date` \| `viewCount` \| `rating` |
| `maxResults` | No | `10` | 1–50 |

---

## Parameter Tables

### Country Codes

| Country | Code | Example Query |
|---------|------|---------------|
| Uzbekistan | `UZ` | `?regionCode=UZ&relevanceLanguage=uz` |
| Russia | `RU` | `?regionCode=RU&relevanceLanguage=ru` |
| United States | `US` | `?regionCode=US&relevanceLanguage=en` |
| Germany | `DE` | `?regionCode=DE&relevanceLanguage=de` |
| United Kingdom | `GB` | `?regionCode=GB&relevanceLanguage=en` |
| France | `FR` | `?regionCode=FR&relevanceLanguage=fr` |
| Japan | `JP` | `?regionCode=JP&relevanceLanguage=ja` |
| South Korea | `KR` | `?regionCode=KR&relevanceLanguage=ko` |
| India | `IN` | `?regionCode=IN&relevanceLanguage=hi` |
| Brazil | `BR` | `?regionCode=BR&relevanceLanguage=pt` |
| Turkey | `TR` | `?regionCode=TR&relevanceLanguage=tr` |
| Kazakhstan | `KZ` | `?regionCode=KZ&relevanceLanguage=kk` |

### Video Category IDs

| Category | ID |
|----------|----|
| Film & Animation | `1` |
| Autos & Vehicles | `2` |
| Music | `10` |
| Pets & Animals | `15` |
| Sports | `17` |
| Travel & Events | `19` |
| Gaming | `20` |
| Videoblogging | `21` |
| People & Blogs | `22` |
| Comedy | `23` |
| Entertainment | `24` |
| News & Politics | `25` |
| Howto & Style | `26` |
| Education | `27` |
| Science & Technology | `28` |
| Nonprofits & Activism | `29` |

> Full list: `GET https://www.googleapis.com/youtube/v3/videoCategories?part=snippet&regionCode=US&key=YOUR_KEY`

---

## Example Requests & Responses

### 1. Search for music videos in Uzbekistan

```bash
curl "http://localhost:3000/api/search?q=uzbek+music&regionCode=UZ&relevanceLanguage=uz&type=video&order=viewCount&maxResults=5&videoCategoryId=10"
```

**Response:**
```json
{
  "kind": "youtube#searchListResponse",
  "etag": "some_etag",
  "nextPageToken": "CAUQAA",
  "prevPageToken": null,
  "regionCode": "UZ",
  "pageInfo": {
    "totalResults": 1000000,
    "resultsPerPage": 5
  },
  "items": [
    {
      "kind": "youtube#searchResult",
      "etag": "...",
      "id": { "kind": "youtube#video", "videoId": "abc123" },
      "snippet": {
        "publishedAt": "2024-01-15T12:00:00Z",
        "channelId": "UC...",
        "title": "Uzbek Music 2024",
        "description": "...",
        "thumbnails": { "high": { "url": "https://i.ytimg.com/vi/abc123/hqdefault.jpg" } },
        "channelTitle": "Music UZ",
        "liveBroadcastContent": "none"
      }
    }
  ]
}
```

---

### 2. Trending in Russia

```bash
curl "http://localhost:3000/api/featured/trending?regionCode=RU&maxResults=5"
```

**Response:**
```json
{
  "kind": "youtube#featuredTrending",
  "regionCode": "RU",
  "nextPageToken": "...",
  "prevPageToken": null,
  "pageInfo": { "totalResults": 200, "resultsPerPage": 5 },
  "items": [
    {
      "kind": "youtube#video",
      "id": "video_id",
      "snippet": { "title": "Popular Video in Russia", ... },
      "statistics": { "viewCount": "10000000", "likeCount": "500000" },
      "contentDetails": { "duration": "PT10M30S" }
    }
  ]
}
```

---

### 3. Best-of gaming videos (long duration, HD)

```bash
curl "http://localhost:3000/api/featured/best-of?q=gaming&videoCategoryId=20&videoDuration=long&videoDefinition=high&maxResults=5"
```

---

### 4. Live streams about football

```bash
curl "http://localhost:3000/api/featured/live?q=football&order=viewCount&maxResults=10"
```

---

### 5. Get full video details by IDs

```bash
curl "http://localhost:3000/api/videos?id=dQw4w9WgXcQ&part=snippet,statistics,contentDetails"
```

**Response:**
```json
{
  "kind": "youtube#videoListResponse",
  "pageInfo": { "totalResults": 1, "resultsPerPage": 1 },
  "items": [
    {
      "kind": "youtube#video",
      "id": "dQw4w9WgXcQ",
      "snippet": {
        "title": "Rick Astley - Never Gonna Give You Up",
        "channelTitle": "Rick Astley"
      },
      "statistics": {
        "viewCount": "1500000000",
        "likeCount": "16000000",
        "commentCount": "3000000"
      },
      "contentDetails": {
        "duration": "PT3M33S",
        "definition": "hd"
      }
    }
  ]
}
```

---

### 6. Top videos in Germany for education

```bash
curl "http://localhost:3000/api/featured/top?regionCode=DE&relevanceLanguage=de&videoCategoryId=27&order=viewCount&maxResults=5&enrich=true"
```

---

### 7. Geo search near Tashkent

```bash
curl "http://localhost:3000/api/search?location=41.2995,69.2401&locationRadius=50km&type=video&maxResults=10"
```

---

### 8. Search channels

```bash
curl "http://localhost:3000/api/search?q=python+programming&type=channel&order=relevance&maxResults=5"
```

---

### 9. Get channel info by handle

```bash
curl "http://localhost:3000/api/channels?forHandle=@MrBeast&part=snippet,statistics"
```

---

### 10. Upcoming concerts in the UK

```bash
curl "http://localhost:3000/api/featured/upcoming?q=concert&regionCode=GB&order=date&maxResults=10"
```

---

## Error Handling

All errors follow a consistent JSON format:

```json
{
  "error": "ErrorType",
  "message": "Human-readable description",
  "details": [
    { "param": "regionCode", "msg": "regionCode must be a 2-letter ISO code", "value": "USA" }
  ]
}
```

| HTTP Status | Error Type | Cause |
|-------------|-----------|-------|
| `400` | `ValidationError` | Invalid/missing query parameters |
| `403` | YouTube API error | Quota exceeded or API key restricted |
| `404` | `Not Found` | Route does not exist |
| `500` | `InternalServerError` | Missing API key or server error |
| `504` | Timeout | YouTube API did not respond in time |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `YOUTUBE_API_KEY` | ✅ Yes | YouTube Data API v3 key from Google Cloud Console |
| `PORT` | No (default: `3000`) | Port the server listens on |

---

*Built with ❤️ by [Bahrullo Shukurov](https://github.com/shukurov777)*
