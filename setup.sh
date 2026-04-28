#!/usr/bin/env bash
# setup.sh — Автоматическая установка всех зависимостей на Debian 12
# Устанавливает: Python 3.11+, pip, yt-dlp, ffmpeg (custom), aria2c, deno
#
# Запуск: sudo bash setup.sh
#
# Автор: Bahrullo Shukurov | github.com/shukurov777
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERR]${NC}   $*" >&2; }
header()  { echo -e "\n${BOLD}${CYAN}══════ $* ══════${NC}"; }

# ── Проверка root ───────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
    error "Скрипт нужно запускать от root: sudo bash setup.sh"
    exit 1
fi

ARCH=$(uname -m)
PYTHON_MIN="3.10"

header "1/7 Обновление системы"
apt-get update -qq
apt-get install -y --no-install-recommends \
    curl wget git ca-certificates gnupg lsb-release \
    python3 python3-pip python3-venv \
    ffmpeg aria2 \
    build-essential libssl-dev libffi-dev \
    2>/dev/null
success "Системные пакеты установлены"

# ── Python версия ───────────────────────────────────────────
header "2/7 Проверка Python"
PY_VER=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
info "Установлен Python $PY_VER"
# Если < 3.10, добавляем deadsnakes
if python3 -c "import sys; sys.exit(0 if sys.version_info >= (3,10) else 1)" 2>/dev/null; then
    success "Python $PY_VER подходит"
else
    warn "Python $PY_VER < 3.10 — устанавливаем 3.11 из репозитория Debian"
    # На Debian 12 (Bookworm) Python 3.11 доступен в основном репозитории
    apt-get install -y python3.11 python3.11-venv python3-pip
    update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1
    success "Python 3.11 установлен"
fi

# ── pip и yt-dlp ────────────────────────────────────────────
header "3/7 Установка yt-dlp и зависимостей"
python3 -m pip install --upgrade pip --quiet
python3 -m pip install --upgrade \
    "yt-dlp[default]" \
    "yt-dlp[curl-cffi]" \
    requests \
    certifi \
    brotli \
    websockets \
    pycryptodomex \
    mutagen \
    --quiet
success "yt-dlp и зависимости установлены"

YDL_VERSION=$(yt-dlp --version 2>/dev/null || python3 -m yt_dlp --version)
info "yt-dlp версия: $YDL_VERSION"

# ── ffmpeg из yt-dlp builds (патченный) ─────────────────────
header "4/7 Установка оптимизированного ffmpeg"
FFMPEG_URL=""
case "$ARCH" in
    x86_64)  FFMPEG_URL="https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz" ;;
    aarch64) FFMPEG_URL="https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linuxarm64-gpl.tar.xz" ;;
    *)       warn "Архитектура $ARCH не поддерживается — пропускаем custom ffmpeg" ;;
esac

if [[ -n "$FFMPEG_URL" ]]; then
    TMP_DIR=$(mktemp -d)
    info "Загрузка ffmpeg из yt-dlp/FFmpeg-Builds..."
    wget -q --show-progress -O "${TMP_DIR}/ffmpeg.tar.xz" "$FFMPEG_URL"
    tar -xf "${TMP_DIR}/ffmpeg.tar.xz" -C "$TMP_DIR"
    FFMPEG_BIN_DIR=$(find "$TMP_DIR" -type d -name "bin" | head -1)
    if [[ -d "$FFMPEG_BIN_DIR" ]]; then
        install -m 755 "${FFMPEG_BIN_DIR}/ffmpeg" /usr/local/bin/ffmpeg
        install -m 755 "${FFMPEG_BIN_DIR}/ffprobe" /usr/local/bin/ffprobe
        success "Патченный ffmpeg установлен в /usr/local/bin/"
    else
        warn "Не удалось найти bin/ в архиве, используем системный ffmpeg"
    fi
    rm -rf "$TMP_DIR"
else
    info "Пропуск кастомного ffmpeg"
fi
FFMPEG_VERSION=$(ffmpeg -version 2>&1 | head -1)
info "$FFMPEG_VERSION"

# ── Deno (JS runtime для YouTube) ───────────────────────────
header "5/7 Установка Deno (JS runtime для yt-dlp)"
if command -v deno &>/dev/null; then
    success "Deno уже установлен: $(deno --version | head -1)"
else
    curl -fsSL https://deno.land/install.sh | sh -s -- --no-modify-path 2>/dev/null
    DENO_BIN="${HOME}/.deno/bin/deno"
    if [[ -f "$DENO_BIN" ]]; then
        ln -sf "$DENO_BIN" /usr/local/bin/deno
        success "Deno установлен: $(deno --version | head -1)"
    else
        warn "Не удалось установить Deno автоматически."
        warn "Вручную: curl -fsSL https://deno.land/install.sh | sh"
    fi
fi

# ── yt-dlp-ejs (для YouTube) ────────────────────────────────
header "6/7 Установка yt-dlp-ejs (для YouTube)"
if command -v deno &>/dev/null || [[ -x /usr/local/bin/deno ]]; then
    python3 -m pip install "yt-dlp[default]" --quiet  # уже установлен
    # yt-dlp-ejs устанавливается yt-dlp автоматически при первом запуске
    info "yt-dlp-ejs будет загружен автоматически при первом запуске YouTube"
else
    warn "Deno не найден — yt-dlp-ejs не будет работать без JS runtime"
fi

# ── Конфигурация ────────────────────────────────────────────
header "7/7 Настройка конфигурации"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONF_DEST="${HOME}/.config/yt-dlp/config"
mkdir -p "${HOME}/.config/yt-dlp" "${HOME}/.cache/yt-dlp" "${HOME}/.aria2"

if [[ -f "${SCRIPT_DIR}/yt-dlp.conf" ]]; then
    cp "${SCRIPT_DIR}/yt-dlp.conf" "$CONF_DEST"
    success "Конфиг скопирован в $CONF_DEST"
else
    warn "yt-dlp.conf не найден рядом со скриптом"
fi

if [[ -f "${SCRIPT_DIR}/aria2.conf" ]]; then
    cp "${SCRIPT_DIR}/aria2.conf" "${HOME}/.aria2/aria2.conf"
    success "aria2.conf скопирован в ${HOME}/.aria2/aria2.conf"
fi

chmod +x "${SCRIPT_DIR}"/*.sh 2>/dev/null || true

# ── Итог ────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}══════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${GREEN}  ✅  Установка завершена успешно!${NC}"
echo -e "${BOLD}${GREEN}══════════════════════════════════════════════════${NC}"
echo ""
echo -e "  yt-dlp   : $(yt-dlp --version 2>/dev/null || echo 'не найден')"
echo -e "  ffmpeg   : $(ffmpeg -version 2>&1 | awk 'NR==1{print $3}')"
echo -e "  aria2c   : $(aria2c --version | head -1)"
echo -e "  deno     : $(deno --version 2>/dev/null | head -1 || echo 'не найден')"
echo ""
echo -e "  Запуск:  ${CYAN}./fast_download.sh <URL>${NC}"
echo -e "  Или:     ${CYAN}python3 fast_download.py <URL>${NC}"
echo ""
