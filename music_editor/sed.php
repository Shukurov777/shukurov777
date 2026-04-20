<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

const YTM_SONGS_FILTER = 'EgWKAQIIAWoKEAMQBBAJEAoQBQ==';
const YTM_REQUIRED_HEADERS = [
    'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language: en-US,en;q=0.9',
    'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Referer: https://music.youtube.com/',
    'Cookie: CONSENT=YES+; SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpX20yMDIzMDgyOC4xMl9wMRoCZW4gAQ..',
];

function respond(array $payload): void
{
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function getByPath(array $source, array $path)
{
    $value = $source;
    foreach ($path as $key) {
        if (!is_array($value) || !array_key_exists($key, $value)) {
            return null;
        }
        $value = $value[$key];
    }
    return $value;
}

function extractText($value): string
{
    if (is_string($value)) {
        return trim($value);
    }

    if (!is_array($value)) {
        return '';
    }

    if (isset($value['simpleText']) && is_string($value['simpleText'])) {
        return trim($value['simpleText']);
    }

    if (isset($value['runs']) && is_array($value['runs'])) {
        $parts = [];
        foreach ($value['runs'] as $run) {
            if (isset($run['text']) && is_string($run['text'])) {
                $parts[] = $run['text'];
            }
        }
        return trim(implode('', $parts));
    }

    if (isset($value['text'])) {
        return extractText($value['text']);
    }

    return '';
}

function normalizeDuration(string $duration): string
{
    $duration = trim($duration);
    if (!preg_match('/^\d{1,2}:\d{2}(?::\d{2})?$/', $duration)) {
        return '';
    }

    $parts = explode(':', $duration);
    if (count($parts) === 2) {
        $parts[0] = str_pad($parts[0], 2, '0', STR_PAD_LEFT);
    }

    return implode(':', $parts);
}

function normalizeViews(string $text): string
{
    if ($text === '') {
        return '';
    }

    if (!preg_match('/([\d][\d,\s.]*)\s+views?/i', $text, $matches)) {
        return '';
    }

    $digits = preg_replace('/\D+/', '', $matches[1] ?? '');
    if ($digits === '' || !is_numeric($digits)) {
        return '';
    }

    return number_format((int) $digits, 0, '.', ',');
}

function findFirstVideoId($node): ?string
{
    if (!is_array($node)) {
        return null;
    }

    if (isset($node['watchEndpoint']['videoId']) && is_string($node['watchEndpoint']['videoId'])) {
        $id = $node['watchEndpoint']['videoId'];
        if (preg_match('/^[a-zA-Z0-9_-]{11}$/', $id)) {
            return $id;
        }
    }

    foreach ($node as $child) {
        if (is_array($child)) {
            $id = findFirstVideoId($child);
            if ($id !== null) {
                return $id;
            }
        }
    }

    return null;
}

function extractYtInitialData(string $html): ?string
{
    $markers = [
        'var ytInitialData = ',
        'window["ytInitialData"] = ',
        'ytInitialData = ',
    ];

    foreach ($markers as $marker) {
        $start = strpos($html, $marker);
        if ($start === false) {
            continue;
        }

        $jsonStart = strpos($html, '{', $start + strlen($marker));
        if ($jsonStart === false) {
            continue;
        }

        $length = strlen($html);
        $depth = 0;
        $inString = false;
        $escaped = false;

        for ($i = $jsonStart; $i < $length; $i++) {
            $char = $html[$i];

            if ($inString) {
                if ($escaped) {
                    $escaped = false;
                    continue;
                }
                if ($char === '\\') {
                    $escaped = true;
                    continue;
                }
                if ($char === '"') {
                    $inString = false;
                }
                continue;
            }

            if ($char === '"') {
                $inString = true;
                continue;
            }

            if ($char === '{') {
                $depth++;
            } elseif ($char === '}') {
                $depth--;
                if ($depth === 0) {
                    return substr($html, $jsonStart, $i - $jsonStart + 1);
                }
            }
        }
    }

    return null;
}

function collectMusicItems($node, array &$items): void
{
    if (!is_array($node)) {
        return;
    }

    if (isset($node['musicResponsiveListItemRenderer']) && is_array($node['musicResponsiveListItemRenderer'])) {
        $items[] = $node['musicResponsiveListItemRenderer'];
    }

    foreach ($node as $child) {
        if (is_array($child)) {
            collectMusicItems($child, $items);
        }
    }
}

function parseTrack(array $item): ?array
{
    $videoId = getByPath($item, ['playlistItemData', 'videoId']);
    if (!is_string($videoId) || !preg_match('/^[a-zA-Z0-9_-]{11}$/', $videoId)) {
        $videoId = findFirstVideoId($item);
    }

    if (!is_string($videoId) || !preg_match('/^[a-zA-Z0-9_-]{11}$/', $videoId)) {
        return null;
    }

    $title = extractText(getByPath($item, ['flexColumns', 0, 'musicResponsiveListItemFlexColumnRenderer', 'text']));
    if ($title === '') {
        return null;
    }

    $author = '';
    $authorRuns = getByPath($item, ['flexColumns', 1, 'musicResponsiveListItemFlexColumnRenderer', 'text', 'runs']);
    if (is_array($authorRuns)) {
        foreach ($authorRuns as $run) {
            $text = trim((string) ($run['text'] ?? ''));
            if ($text === '' || $text === '•') {
                if ($text === '•') {
                    break;
                }
                continue;
            }

            if (isset($run['navigationEndpoint']['browseEndpoint'])) {
                $author = $text;
                break;
            }

            if (!preg_match('/^\d{1,2}:\d{2}(?::\d{2})?$/', $text) && stripos($text, 'views') === false) {
                $author = $text;
                break;
            }
        }
    }

    $duration = '';
    $durationCandidates = [
        extractText(getByPath($item, ['fixedColumns', 0, 'musicResponsiveListItemFixedColumnRenderer', 'text'])),
        extractText(getByPath($item, ['fixedColumns', 1, 'musicResponsiveListItemFixedColumnRenderer', 'text'])),
    ];

    foreach ($durationCandidates as $candidate) {
        $normalized = normalizeDuration($candidate);
        if ($normalized !== '') {
            $duration = $normalized;
            break;
        }
    }

    if ($duration === '') {
        $allTexts = [];
        $stack = [$item];
        while ($stack) {
            $current = array_pop($stack);
            if (!is_array($current)) {
                continue;
            }
            $text = extractText($current);
            if ($text !== '') {
                $allTexts[] = $text;
            }
            foreach ($current as $child) {
                if (is_array($child)) {
                    $stack[] = $child;
                }
            }
        }
        foreach ($allTexts as $text) {
            if (preg_match('/\b(\d{1,2}:\d{2}(?::\d{2})?)\b/', $text, $m)) {
                $duration = normalizeDuration($m[1]);
                if ($duration !== '') {
                    break;
                }
            }
        }
    }

    $views = '';
    $viewCandidates = [
        extractText(getByPath($item, ['flexColumns', 1, 'musicResponsiveListItemFlexColumnRenderer', 'text'])),
        extractText(getByPath($item, ['fixedColumns', 0, 'musicResponsiveListItemFixedColumnRenderer', 'text'])),
        extractText(getByPath($item, ['fixedColumns', 1, 'musicResponsiveListItemFixedColumnRenderer', 'text'])),
    ];
    foreach ($viewCandidates as $candidate) {
        $views = normalizeViews($candidate);
        if ($views !== '') {
            break;
        }
    }

    return [
        'id' => $videoId,
        'title' => $title,
        'author' => $author,
        'url' => 'https://www.youtube.com/watch?v=' . $videoId,
        'views' => $views,
        'duration' => $duration,
    ];
}

$query = trim((string) ($_GET['q'] ?? ''));
if ($query === '') {
    respond(['result' => [], 'error' => 'Missing required parameter: q']);
}

$limitRaw = $_GET['limit'] ?? 35;
$limit = (int) $limitRaw;
if ($limit <= 0) {
    $limit = 35;
}
$limit = min($limit, 35);

$url = 'https://music.youtube.com/search?' . http_build_query([
    'q' => $query,
    'sp' => YTM_SONGS_FILTER,
]);

$ch = curl_init($url);
if ($ch === false) {
    respond(['result' => [], 'error' => 'Failed to initialize cURL']);
}

curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 15,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_ENCODING => 'gzip, deflate',
    CURLOPT_HTTPHEADER => YTM_REQUIRED_HEADERS,
]);

$html = curl_exec($ch);
$curlError = curl_error($ch);
$statusCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if (!is_string($html) || $html === '') {
    $errorMessage = $curlError !== '' ? $curlError : 'Empty response from YouTube Music';
    respond(['result' => [], 'error' => 'Request failed: ' . $errorMessage]);
}

if ($statusCode >= 400) {
    respond(['result' => [], 'error' => 'YouTube Music responded with HTTP ' . $statusCode]);
}

$initialDataJson = extractYtInitialData($html);
if ($initialDataJson === null) {
    respond(['result' => [], 'error' => 'Failed to extract ytInitialData']);
}

$initialData = json_decode($initialDataJson, true);
if (!is_array($initialData)) {
    respond(['result' => [], 'error' => 'Failed to decode ytInitialData']);
}

$items = [];
collectMusicItems($initialData, $items);

$result = [];
$seen = [];
foreach ($items as $item) {
    $track = parseTrack($item);
    if ($track === null) {
        continue;
    }
    if (isset($seen[$track['id']])) {
        continue;
    }

    $seen[$track['id']] = true;
    $result[] = $track;
    if (count($result) >= $limit) {
        break;
    }
}

respond(['result' => $result]);
