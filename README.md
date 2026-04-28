<p align="center">
  <img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&weight=700&size=32&pause=800&color=00FF9F&center=true&vCenter=true&width=900&lines=👋+Bahrullo+Shukurov;🐍+Python+%26+Backend+Developer;🚀+yt-dlp+Speed+Optimizer;Telegram+боты+на+Python" alt="Typing SVG" />
</p>

<h1 align="center">Bahrullo Shukurov</h1>
<h3 align="center">🐍 Python Backend Developer</h3>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/PHP-777BB4?style=for-the-badge&logo=php&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Telegram-26A5E4?style=for-the-badge&logo=telegram&logoColor=white" />
  <img src="https://img.shields.io/badge/Debian-A81D33?style=for-the-badge&logo=debian&logoColor=white" />
</p>

---

# 🚀 yt-dlp Speed Optimizer — Максимальная скорость на Debian 12

> Комплект файлов для настройки **yt-dlp** на Linux-сервере (Debian 12).  
> Ускоряет загрузку видео в **5–20 раз** по сравнению с настройками по умолчанию.

---

## 📋 Содержание

- [Почему yt-dlp работает медленно](#-почему-yt-dlp-работает-медленно)
- [Что входит в этот репозиторий](#-что-входит-в-этот-репозиторий)
- [Быстрый старт](#-быстрый-старт)
- [Подробная установка](#-подробная-установка)
- [Использование](#-использование)
- [Описание файлов](#-описание-файлов)
- [Тонкая настройка](#-тонкая-настройка)
- [FAQ](#-faq)
- [Контакты](#-контакты)

---

## ❓ Почему yt-dlp работает медленно

По умолчанию yt-dlp использует:
- **1 поток** загрузки
- **Встроенный HTTP-клиент** (медленнее aria2c)
- **Маленький буфер** (16 KiB)
- **Нет параллельных фрагментов** (HLS/DASH загружается последовательно)

Этот репозиторий исправляет **все** эти проблемы.

---

## 📦 Что входит в этот репозиторий

| Файл | Назначение |
|------|-----------|
| `setup.sh` | 🔧 Автоматическая установка всех зависимостей на Debian 12 |
| `yt-dlp.conf` | ⚙️ Оптимизированный конфиг yt-dlp |
| `aria2.conf` | ⚡ Конфиг aria2c — быстрый внешний загрузчик |
| `common.py` | 🐍 Python-библиотека с оптимальными параметрами |
| `fast_download.py` | 🎬 Скрипт загрузки одного видео |
| `batch_download.py` | 📋 Параллельная загрузка плейлистов / списков URL |
| `fast_download.sh` | 💾 Bash-обёртка с полным набором флагов |
| `monitor.sh` | 📊 Мониторинг процессов и скорости в реальном времени |
| `requirements.txt` | 📌 Python-зависимости |

---

## ⚡ Быстрый старт

```bash
# 1. Клонируем репозиторий
git clone https://github.com/shukurov777/shukurov777.git
cd shukurov777

# 2. Устанавливаем всё автоматически
sudo bash setup.sh

# 3. Скачиваем видео
./fast_download.sh "https://www.youtube.com/watch?v=XXXXXXX"

# Или через Python
python3 fast_download.py "https://www.youtube.com/watch?v=XXXXXXX"
```

---

## 🔧 Подробная установка

### Шаг 1 — Обновите систему

```bash
sudo apt update && sudo apt upgrade -y
```

### Шаг 2 — Запустите setup.sh

```bash
sudo bash setup.sh
```

Скрипт автоматически:
1. Устанавливает **Python 3.11+** (если нужно)
2. Устанавливает **yt-dlp** со всеми зависимостями (`curl-cffi`, `pycryptodomex`, `brotli`, etc.)
3. Устанавливает **ffmpeg** из официальных сборок [yt-dlp/FFmpeg-Builds](https://github.com/yt-dlp/FFmpeg-Builds) с патчами
4. Устанавливает **aria2c** — многопоточный внешний загрузчик
5. Устанавливает **Deno** — JS runtime, необходимый для YouTube
6. Копирует конфиги в `~/.config/yt-dlp/config` и `~/.aria2/aria2.conf`

### Шаг 3 — Проверьте версии

```bash
yt-dlp --version
ffmpeg -version
aria2c --version
deno --version
```

### Шаг 4 (опционально) — Обновите yt-dlp до nightly

```bash
# Nightly — обновляется каждый день, содержит последние исправления для YouTube
yt-dlp --update-to nightly
```

---

## 🎬 Использование

### Одиночное видео (Bash)

```bash
./fast_download.sh "https://www.youtube.com/watch?v=XXXXXXX"
./fast_download.sh "https://www.youtube.com/watch?v=XXXXXXX" /path/to/output
```

### Одиночное видео (Python)

```bash
python3 fast_download.py "https://www.youtube.com/watch?v=XXXXXXX"
python3 fast_download.py "https://www.youtube.com/watch?v=XXXXXXX" /path/to/output
```

### Плейлист (с параллельными загрузками)

```bash
# Плейлист YouTube (3 параллельных загрузки)
python3 batch_download.py "https://www.youtube.com/playlist?list=PL..." ~/downloads --workers 3

# Файл с URL-адресами (по одному в строке)
python3 batch_download.py urls.txt ~/downloads --workers 5
```

### Формат файла urls.txt

```
# Это комментарий — строки с # игнорируются
https://www.youtube.com/watch?v=video1
https://www.youtube.com/watch?v=video2
https://vimeo.com/123456789
```

### Мониторинг загрузок

```bash
# Мониторинг в реальном времени (обновление каждые 2 сек)
./monitor.sh

# Разовый вывод
./monitor.sh --once
```

### Использование common.py как библиотеки

```python
import yt_dlp
from common import get_fast_opts, get_playlist_opts

# Одиночное видео
with yt_dlp.YoutubeDL(get_fast_opts()) as ydl:
    ydl.download(["https://youtu.be/XXXXXXX"])

# Плейлист
with yt_dlp.YoutubeDL(get_playlist_opts()) as ydl:
    ydl.download(["https://youtube.com/playlist?list=PL..."])

# Кастомизация
custom_opts = get_fast_opts(
    output_dir="/srv/media",
    concurrent_fragments=16,
    quiet=True,
    extra={"format": "bestaudio/best"},  # только аудио
)
with yt_dlp.YoutubeDL(custom_opts) as ydl:
    ydl.download([url])
```

---

## 📁 Описание файлов

### `yt-dlp.conf` — Главный конфиг

Автоматически применяется при каждом запуске `yt-dlp`, когда скопирован в `~/.config/yt-dlp/config`.

Ключевые настройки:
```
--concurrent-fragments 8    # 8 фрагментов HLS/DASH параллельно
--downloader aria2c         # внешний загрузчик
--http-chunk-size 10M       # большие чанки
--buffer-size 16K           # увеличенный буфер
--retries 10                # 10 попыток при ошибке
--postprocessor-args "ffmpeg:-c copy"  # без перекодирования
```

### `aria2.conf` — Конфиг aria2c

```
max-connection-per-server=16   # 16 соединений на сервер
split=16                       # 16 частей на файл
disk-cache=64M                 # кэш на диске
min-split-size=1M              # мин. размер части
```

### `common.py` — Python-библиотека

Предоставляет функции:
- `get_fast_opts()` — базовые быстрые настройки
- `get_playlist_opts()` — настройки для плейлистов

### `fast_download.py` — Одиночная загрузка

### `batch_download.py` — Параллельная загрузка

Использует `ThreadPoolExecutor` для одновременного скачивания нескольких видео.

### `fast_download.sh` — Bash-обёртка

Можно настраивать через переменные окружения:
```bash
YDL_FRAGMENTS=16 YDL_WORKERS=16 ./fast_download.sh "URL"
```

### `setup.sh` — Установочный скрипт

---

## ⚙️ Тонкая настройка

### Увеличить параллельность (мощный сервер)

В `yt-dlp.conf`:
```
--concurrent-fragments 16
```

В `aria2.conf`:
```
max-connection-per-server=16
split=32
disk-cache=128M
```

### Только аудио (максимальное качество)

```bash
yt-dlp --config-location yt-dlp.conf \
    -f "bestaudio/best" \
    --extract-audio \
    --audio-format mp3 \
    --audio-quality 0 \
    "URL"
```

### Добавить куки (для Premium-контента)

```bash
# Экспортируйте куки из браузера в файл cookies.txt
yt-dlp --cookies-from-browser chrome ...
# Или укажите файл
yt-dlp --cookies ~/.config/yt-dlp/cookies.txt ...
```

Раскомментируйте строку в `aria2.conf`:
```
load-cookies=/root/.config/yt-dlp/cookies.txt
```

### Прокси

```bash
yt-dlp --proxy socks5://127.0.0.1:1080 "URL"
```

Или в `yt-dlp.conf`:
```
--proxy socks5://127.0.0.1:1080
```

### Автоматическое обновление yt-dlp (cron)

```bash
# Добавить в crontab: crontab -e
0 4 * * * /usr/local/bin/yt-dlp --update-to nightly >> /var/log/yt-dlp-update.log 2>&1
```

---

## ❓ FAQ

**Q: Почему aria2c быстрее встроенного загрузчика?**  
A: aria2c открывает **16 параллельных TCP-соединений** к одному серверу и загружает файл по частям одновременно. Встроенный загрузчик yt-dlp использует 1 соединение.

**Q: Что такое `--concurrent-fragments`?**  
A: Для видео в формате HLS (`.m3u8`) или DASH (`.mpd`) файл разбит на сотни маленьких фрагментов. Флаг позволяет скачивать **N фрагментов одновременно**. По умолчанию — 1.

**Q: Нужен ли Deno?**  
A: Да, для YouTube. yt-dlp использует JS-движок для обхода защиты YouTube. Без Deno (или Node.js) некоторые видео не будут скачиваться.

**Q: Почему ffmpeg из yt-dlp/FFmpeg-Builds лучше системного?**  
A: Команда yt-dlp поддерживает патченные сборки ffmpeg с исправлениями багов, специфичных для использования с yt-dlp (мёрджинг потоков, работа с DASH и т.д.).

**Q: Как скачать только субтитры?**  
```bash
yt-dlp --write-subs --skip-download --sub-lang ru "URL"
```

**Q: Как ограничить скорость (чтобы не перегружать сеть)?**  
```bash
yt-dlp --limit-rate 5M "URL"  # 5 MB/s
```

---

## ⚡ Статистика

<p align="center">
  <img width="49%" src="https://github-readme-stats.vercel.app/api?username=shukurov777&show_icons=true&theme=radical&hide_border=true" />
  <img width="49%" src="https://github-readme-streak-stats.herokuapp.com/?user=shukurov777&theme=radical&hide_border=true" />
</p>

---

## 📬 Контакты

<p align="center">
  <a href="https://t.me/baxxa">
    <img src="https://img.shields.io/badge/Telegram-26A5E4?style=for-the-badge&logo=telegram&logoColor=white" />
  </a>
  <a href="https://github.com/shukurov777">
    <img src="https://img.shields.io/badge/GitHub-000000?style=for-the-badge&logo=github&logoColor=white" />
  </a>
</p>

---

<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="100%">
