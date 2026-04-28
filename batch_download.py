#!/usr/bin/env python3
"""
batch_download.py — Параллельное скачивание плейлиста или списка URL.

Использование:
    python batch_download.py <playlist_or_urls_file> [output_dir] [--workers N]

Примеры:
    python batch_download.py "https://youtube.com/playlist?list=PL..."
    python batch_download.py urls.txt ~/downloads --workers 4

Автор: Bahrullo Shukurov | github.com/shukurov777
"""

import sys
import argparse
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

try:
    import yt_dlp
except ImportError:
    sys.exit("❌ yt-dlp не установлен. Выполните: pip install -U yt-dlp")

from common import get_fast_opts, get_playlist_opts, logger, OUTPUT_DIR


def _is_url(text: str) -> bool:
    return text.startswith(("http://", "https://", "ftp://"))


def _extract_urls(source: str) -> list[str]:
    """Разбирает источник: одиночный URL или файл со ссылками."""
    if _is_url(source):
        return [source]
    path = Path(source)
    if not path.exists():
        sys.exit(f"❌ Файл не найден: {source}")
    lines = path.read_text(encoding="utf-8").splitlines()
    return [ln.strip() for ln in lines if ln.strip() and not ln.startswith("#")]


def download_single(url: str, opts: dict) -> tuple[str, bool]:
    """Скачивает один URL. Возвращает (url, success)."""
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            code = ydl.download([url])
        return url, code == 0
    except yt_dlp.utils.DownloadError as exc:
        logger.error("❌ Ошибка загрузки для %s: %s", url, exc)
        return url, False
    except Exception:  # noqa: BLE001
        logger.exception("❌ Неожиданная ошибка для %s", url)
        return url, False


def download_playlist(url: str, output_dir: Path, workers: int) -> None:
    """Извлекает все URL плейлиста и загружает параллельно."""
    flat_opts: dict = {
        "quiet": True,
        "extract_flat": "in_playlist",
        "skip_download": True,
    }
    logger.info("📋 Извлечение URL из плейлиста...")
    with yt_dlp.YoutubeDL(flat_opts) as ydl:
        info = ydl.extract_info(url, download=False)

    if not info:
        logger.error("❌ Не удалось получить информацию о плейлисте")
        return

    entries = info.get("entries") or []
    if not entries:
        # Одиночное видео
        entries = [info]

    urls = [
        e.get("url") or e.get("webpage_url") or e.get("id")
        for e in entries
        if e
    ]
    urls = [u for u in urls if u]
    logger.info("🎬 Найдено %d видео. Запуск с %d потоками...", len(urls), workers)

    single_opts = get_fast_opts(output_dir=output_dir)
    ok_count = 0

    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(download_single, u, single_opts): u for u in urls}
        for fut in as_completed(futures):
            _, success = fut.result()
            if success:
                ok_count += 1

    logger.info("✅ Завершено: %d/%d успешно.", ok_count, len(urls))


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Быстрое скачивание плейлиста / списка URL через yt-dlp"
    )
    parser.add_argument("source", help="URL плейлиста или файл с URL-адресами (по одному в строке)")
    parser.add_argument("output_dir", nargs="?", default=str(OUTPUT_DIR), help="Директория для сохранения")
    parser.add_argument("--workers", type=int, default=3, help="Параллельных загрузок (по умолчанию: 3)")
    args = parser.parse_args()

    out = Path(args.output_dir)
    source = args.source

    if _is_url(source) and ("playlist" in source or "channel" in source or "@" in source):
        download_playlist(source, out, args.workers)
    else:
        urls = _extract_urls(source)
        logger.info("🎬 Найдено %d URL. Запуск с %d потоками...", len(urls), args.workers)
        single_opts = get_fast_opts(output_dir=out)
        ok_count = 0

        with ThreadPoolExecutor(max_workers=args.workers) as pool:
            futures = {pool.submit(download_single, u, single_opts): u for u in urls}
            for fut in as_completed(futures):
                _, success = fut.result()
                if success:
                    ok_count += 1

        logger.info("✅ Завершено: %d/%d успешно.", ok_count, len(urls))


if __name__ == "__main__":
    main()
