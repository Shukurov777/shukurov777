#!/usr/bin/env python3
"""
fast_download.py — Быстрое скачивание одного видео через yt-dlp.
Использует оптимальные настройки из common.py.

Использование:
    python fast_download.py <URL> [output_dir]

Автор: Bahrullo Shukurov | github.com/shukurov777
"""

import sys
from pathlib import Path

try:
    import yt_dlp
except ImportError:
    sys.exit("❌ yt-dlp не установлен. Выполните: pip install -U yt-dlp")

from common import get_fast_opts, logger, OUTPUT_DIR


def download(url: str, output_dir: Path = OUTPUT_DIR) -> int:
    """
    Скачивает одно видео.

    Returns:
        0 — успех, 1 — ошибка.
    """
    opts = get_fast_opts(output_dir=output_dir)
    logger.info("🚀 Запуск загрузки: %s", url)

    with yt_dlp.YoutubeDL(opts) as ydl:
        code = ydl.download([url])

    return code


def main() -> None:
    if len(sys.argv) < 2:
        print(f"Использование: {sys.argv[0]} <URL> [output_dir]")
        sys.exit(1)

    url = sys.argv[1]
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else OUTPUT_DIR
    sys.exit(download(url, out))


if __name__ == "__main__":
    main()
