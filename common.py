#!/usr/bin/env python3
"""
common.py — Общие утилиты и оптимальные параметры для yt-dlp
Используется как библиотека в других скриптах.
Автор: Bahrullo Shukurov | github.com/shukurov777
"""

import os
import sys
import logging
from pathlib import Path

# ─────────────────────────────────────────────────────────────
# Базовые пути
# ─────────────────────────────────────────────────────────────
HOME = Path.home()
CACHE_DIR = HOME / ".cache" / "yt-dlp"
COOKIES_FILE = HOME / ".config" / "yt-dlp" / "cookies.txt"
OUTPUT_DIR = Path(os.getenv("YDL_OUTPUT_DIR", str(HOME / "downloads")))
ARIA2_CONF = Path(__file__).parent / "aria2.conf"

# ─────────────────────────────────────────────────────────────
# Логгер
# ─────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("yt-dlp-fast")


def _aria2c_args() -> str:
    """Возвращает аргументы для aria2c."""
    args = [
        "-x 16",          # соединений на сервер
        "-s 16",          # сегментов
        "-k 1M",          # мин. размер сегмента
        "--max-connection-per-server=16",
        "--allow-overwrite=true",
        "--async-dns=false",
        "--disk-cache=64M",
    ]
    if ARIA2_CONF.exists():
        args.append(f"--conf-path={ARIA2_CONF}")
    return " ".join(args)


def _cookies_opts() -> dict:
    """Добавляет куки если файл существует."""
    if COOKIES_FILE.exists():
        return {"cookiefile": str(COOKIES_FILE)}
    return {}


def get_fast_opts(
    output_dir: Path | None = None,
    concurrent_fragments: int = 8,
    quiet: bool = False,
    extra: dict | None = None,
) -> dict:
    """
    Возвращает словарь оптимальных параметров для yt_dlp.YoutubeDL.

    Args:
        output_dir: Директория для сохранения файлов.
        concurrent_fragments: Параллельных фрагментов (HLS/DASH).
        quiet: Подавить вывод прогресса.
        extra: Дополнительные параметры (перекрывают базовые).

    Returns:
        dict с настройками для YoutubeDL.
    """
    dest = output_dir or OUTPUT_DIR
    dest.mkdir(parents=True, exist_ok=True)

    opts: dict = {
        # ── Формат ────────────────────────────────────────────
        "format": "bv*[ext=mp4]+ba[ext=m4a]/bv*+ba/best",
        "merge_output_format": "mp4",

        # ── Скорость загрузки ─────────────────────────────────
        "concurrent_fragment_downloads": concurrent_fragments,
        "buffersize": 1024 * 16,        # 16 KiB
        "http_chunk_size": 1024 * 1024 * 10,  # 10 MiB

        # ── Внешний загрузчик ─────────────────────────────────
        "external_downloader": "aria2c",
        "external_downloader_args": {"default": _aria2c_args().split()},

        # ── Пост-обработка ────────────────────────────────────
        "postprocessor_args": {"ffmpeg": ["-c", "copy"]},
        "prefer_ffmpeg": True,

        # ── Повторные попытки ─────────────────────────────────
        "retries": 10,
        "fragment_retries": 10,
        "file_access_retries": 3,
        "retry_sleep_functions": {"http": lambda n: min(4 ** n, 60)},

        # ── Таймауты ──────────────────────────────────────────
        "socket_timeout": 30,

        # ── Файловая система ──────────────────────────────────
        "outtmpl": str(dest / "%(uploader)s/%(title)s.%(ext)s"),
        "restrictfilenames": True,
        "nopart": True,
        "no_mtime": True,

        # ── Кэш ───────────────────────────────────────────────
        "cachedir": str(CACHE_DIR),

        # ── Сеть ──────────────────────────────────────────────
        "nocheckcertificate": True,
        "prefer_insecure": True,
        "http_headers": {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/131.0.0.0 Safari/537.36"
            ),
        },

        # ── Прочее ────────────────────────────────────────────
        "quiet": quiet,
        "no_warnings": True,
        "ignoreerrors": True,
        "consoletitle": True,
        "logger": logger,

        # ── Прогресс-хуки ─────────────────────────────────────
        "progress_hooks": [_progress_hook],
    }

    opts.update(_cookies_opts())
    if extra:
        opts.update(extra)

    return opts


def _progress_hook(d: dict) -> None:
    """Простой прогресс-хук: логирует скорость и ETA."""
    if d["status"] == "downloading":
        speed = d.get("speed")
        eta = d.get("eta")
        if speed and eta is not None:
            speed_mb = speed / 1_000_000
            logger.info(
                "⬇ %.1f MB/s  ETA %ds  —  %s",
                speed_mb,
                eta,
                d.get("filename", ""),
            )
    elif d["status"] == "finished":
        logger.info("✅ Загружено: %s", d.get("filename", ""))
    elif d["status"] == "error":
        logger.error("❌ Ошибка: %s", d.get("filename", ""))


def get_playlist_opts(
    output_dir: Path | None = None,
    workers: int = 4,
    **kwargs,
) -> dict:
    """
    Параметры для быстрого скачивания плейлистов.

    Args:
        output_dir: Директория назначения.
        workers: Параллельных загрузок (используется в ThreadPoolExecutor).
        **kwargs: Передаются в get_fast_opts.
    """
    opts = get_fast_opts(output_dir=output_dir, **kwargs)
    opts.update(
        {
            "noplaylist": False,
            "playlistend": None,
            "outtmpl": str(
                (output_dir or OUTPUT_DIR) / "%(playlist_title)s/%(playlist_index)03d_%(title)s.%(ext)s"
            ),
        }
    )
    return opts


if __name__ == "__main__":
    import json

    print("=== Базовые настройки yt-dlp-fast ===")
    opts = get_fast_opts()
    # Убираем непечатаемые объекты для JSON-вывода
    printable = {
        k: v
        for k, v in opts.items()
        if not callable(v) and k not in ("logger", "progress_hooks", "retry_sleep_functions")
    }
    print(json.dumps(printable, indent=2, ensure_ascii=False))
