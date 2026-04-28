#!/usr/bin/env bash
# fast_download.sh — Bash-обёртка для yt-dlp с максимальной скоростью
# Использует aria2c и оптимальные флаги.
#
# Использование:
#   ./fast_download.sh <URL> [output_dir]
#
# Автор: Bahrullo Shukurov | github.com/shukurov777
set -euo pipefail

# ── Цвета ──────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERR]${NC}   $*" >&2; }

# ── Проверка зависимостей ──────────────────────────────────
check_deps() {
    local missing=()
    for cmd in yt-dlp ffmpeg aria2c; do
        if ! command -v "$cmd" &>/dev/null; then
            missing+=("$cmd")
        fi
    done
    if [[ ${#missing[@]} -gt 0 ]]; then
        error "Отсутствуют зависимости: ${missing[*]}"
        error "Запустите ./setup.sh для автоматической установки."
        exit 1
    fi
}

# ── Параметры ──────────────────────────────────────────────
URL="${1:-}"
OUTPUT_DIR="${2:-${HOME}/downloads}"
CONCURRENT_FRAGMENTS="${YDL_FRAGMENTS:-8}"
WORKERS="${YDL_WORKERS:-16}"         # aria2c соединений
CONFIG_FILE="$(dirname "$0")/yt-dlp.conf"

if [[ -z "$URL" ]]; then
    echo "Использование: $0 <URL> [output_dir]"
    exit 1
fi

mkdir -p "$OUTPUT_DIR"
check_deps

info "🚀 Загрузка: $URL"
info "📁 Директория: $OUTPUT_DIR"
info "🔀 Фрагментов: $CONCURRENT_FRAGMENTS | Соединений aria2c: $WORKERS"

# ── Запуск yt-dlp ──────────────────────────────────────────
ARIA2_ARGS="-x ${WORKERS} -s ${WORKERS} -k 1M --max-connection-per-server=${WORKERS} --allow-overwrite=true --async-dns=false --disk-cache=64M"

YT_DLP_ARGS=(
    --config-location "${CONFIG_FILE}"
    --concurrent-fragments "${CONCURRENT_FRAGMENTS}"
    --downloader aria2c
    --downloader-args "aria2c:${ARIA2_ARGS}"
    --format "bv*[ext=mp4]+ba[ext=m4a]/bv*+ba/best"
    --merge-output-format mp4
    --postprocessor-args "ffmpeg:-c copy"
    --output "${OUTPUT_DIR}/%(uploader)s/%(title)s.%(ext)s"
    --no-part
    --restrict-filenames
    --retries 10
    --fragment-retries 10
    --buffer-size 16K
    --http-chunk-size 10M
    --no-warnings
    --no-mtime
    --cache-dir "${HOME}/.cache/yt-dlp"
    --console-title
    "$URL"
)

if yt-dlp "${YT_DLP_ARGS[@]}"; then
    success "✅ Готово! Файл сохранён в ${OUTPUT_DIR}"
else
    error "Загрузка завершилась с ошибкой."
    exit 1
fi
