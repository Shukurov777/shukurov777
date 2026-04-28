#!/usr/bin/env bash
# monitor.sh — Мониторинг процессов yt-dlp и скорости сети в реальном времени
# Требует: watch, nethogs (опционально), или ss/ip
#
# Использование:
#   ./monitor.sh           — показывает статистику каждые 2 секунды
#   ./monitor.sh --once    — разовый вывод
#
# Автор: Bahrullo Shukurov | github.com/shukurov777
set -euo pipefail

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

ONCE=false
[[ "${1:-}" == "--once" ]] && ONCE=true

show_stats() {
    clear
    echo -e "${BOLD}${CYAN}══════════════════════════════════════════════${NC}"
    echo -e "${BOLD}  📊  yt-dlp Monitor  —  $(date '+%H:%M:%S')${NC}"
    echo -e "${BOLD}${CYAN}══════════════════════════════════════════════${NC}"
    echo ""

    # ── Активные процессы yt-dlp / aria2c ─────────────────
    echo -e "${BOLD}🔄 Процессы:${NC}"
    ps aux | grep -E "(yt[-_]dlp|yt_dlp|aria2c)" | grep -v grep \
        | awk '{printf "  PID %-7s  CPU %-5s  MEM %-5s  %s\n", $2, $3"%", $4"%", substr($0, index($0,$11))}' \
        || echo "  — нет активных процессов"
    echo ""

    # ── Сетевые соединения aria2c ─────────────────────────
    echo -e "${BOLD}🌐 Соединения aria2c:${NC}"
    ARIA_PIDS=$(pgrep -x aria2c 2>/dev/null | tr '\n' ',' | sed 's/,$//' || echo "")
    if [[ -n "$ARIA_PIDS" ]]; then
        ss -tp 2>/dev/null | grep -E "ESTAB.*($ARIA_PIDS)" | wc -l | \
            xargs -I{} echo "  Активных TCP-соединений: {}"
    else
        echo "  — aria2c не запущен"
    fi
    echo ""

    # ── Статистика диска ──────────────────────────────────
    echo -e "${BOLD}💾 Диск:${NC}"
    df -h "${HOME}/downloads" 2>/dev/null || df -h /
    echo ""

    # ── Последние загруженные файлы ───────────────────────
    echo -e "${BOLD}📁 Последние файлы в ~/downloads:${NC}"
    if [[ -d "${HOME}/downloads" ]]; then
        find "${HOME}/downloads" -type f -newer /tmp/.ydl_monitor_stamp 2>/dev/null \
            | head -5 | while read -r f; do
                SIZE=$(du -sh "$f" 2>/dev/null | cut -f1)
                echo "  ${GREEN}$SIZE${NC}  $f"
            done
    else
        echo "  — директория ~/downloads не существует"
    fi

    # Обновляем временную метку
    touch /tmp/.ydl_monitor_stamp 2>/dev/null || true
    echo ""

    # ── Нагрузка системы ──────────────────────────────────
    echo -e "${BOLD}⚙  Система:${NC}"
    uptime | awk '{print "  Uptime:" $3 $4 $5 "  Load:" $8 $9 $10}'
    free -h | awk 'NR==2{printf "  RAM: используется %s / %s (своб. %s)\n", $3, $2, $4}'
    echo ""
    echo -e "  ${YELLOW}Нажмите Ctrl+C для выхода${NC}"
}

if $ONCE; then
    show_stats
else
    while true; do
        show_stats
        sleep 2
    done
fi
