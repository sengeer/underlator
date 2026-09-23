# Desktop Tauri (атом 5.2)

Документ для клонировавших репозиторий: как собрать и запустить **desktop**-хост Underlator на Tauri 2, какие native deps нужны, какие канонические артефакты получаются и что уже проверено на машинах.

## Режимы: Desktop (Tauri) vs Docker (server) vs Electron

| Режим | Host | Когда использовать |
| --- | --- | --- |
| **Desktop (Tauri)** | `crates/underlator-tauri` + `react-app` | Нативная сборка/запуск на Linux / macOS / Windows; цель dual-mode desktop после атома 5.1 |
| **Docker (server)** | `crates/underlator-server` + compose | Серверный HTTP/SSE host; UI через браузер к API |
| **Electron (временно)** | `electron-app` + `react-app` | Текущий production desktop до атома **6.1**; **не** удалять, пока не закрыт gate 5.2 |

До закрытия атома 5.2 (рабочий AppImage на Fedora Workstation 44 + этот документ для macOS/Windows) **запрещено** начинать выпил Electron / `ElectronTransport` / `electron-app` (атом 6.1).

## Переменные окружения

| Переменная | Назначение | Default |
| --- | --- | --- |
| `OLLAMA_BASE_URL` | URL локального Ollama для desktop | `http://127.0.0.1:11434` (не docker DNS `http://ollama:11434`) |
| `UNDERLATOR_DATA_DIR` | Override корня данных чатов | app data dir платформы (см. ниже) |
| `UNDERLATOR_PROVIDER_ID` | Id провайдера в factory ядра | `ollama` |

Каталог данных desktop (если `UNDERLATOR_DATA_DIR` не задан) — стандартный app data dir Tauri / ОС, например:

- Linux: `~/.local/share/app.underlator.desktop/` (или аналог по идентификатору `app.underlator.desktop`)
- macOS: `~/Library/Application Support/app.underlator.desktop/`
- Windows: `%APPDATA%\app.underlator.desktop\`

Точный путь зависит от WebView/OS conventions; для smoke-тестов удобно задать явный `UNDERLATOR_DATA_DIR=/tmp/underlator-smoke`.

## Native prerequisites

### Linux (Fedora Workstation 44 — машина приёмки)

WebView / GTK (сборка и runtime):

```bash
sudo dnf install -y \
  webkit2gtk4.1-devel \
  gtk3-devel \
  libappindicator-gtk3 \
  librsvg2-devel \
  openssl-devel \
  curl wget file \
  gcc gcc-c++ make
```

AppImage / FUSE (сборка bundler + запуск `.AppImage`):

```bash
sudo dnf install -y fuse fuse3
# при необходимости для linuxdeploy / appimagetool bundler подтянет сам;
# если bundler ругается на отсутствующие libs — доустановите по тексту ошибки.
```

Также нужны: Rust toolchain (`rustup`), Node.js + npm (для `react-app`), `cargo-tauri` CLI:

```bash
cargo install tauri-cli --version "^2" --locked
```

### macOS (только Apple Silicon arm64 в скоупе 5.2)

- Xcode Command Line Tools: `xcode-select --install`
- Rust target: `rustup target add aarch64-apple-darwin` (на Apple Silicon обычно уже есть)
- Node.js + npm
- `cargo install tauri-cli --version "^2" --locked`
- Intel `x86_64-apple-darwin` **вне** скоупа 5.2

### Windows 11 (portable zip)

- [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) / VS Build Tools с workload «Desktop development with C++»
- WebView2 Runtime (обычно уже есть на Win11; иначе Evergreen Bootstrapper)
- Rust `x86_64-pc-windows-msvc`, Node.js + npm, `cargo-tauri` 2.x
- Утилита `zip` (Git Bash / PowerShell `Compress-Archive`) для канонического portable-архива

## Типичные ошибки deps

| Симптом | Что проверить |
| --- | --- |
| `webkit2gtk` / `javascriptcoregtk` not found | пакеты `webkit2gtk4.1-devel` (Fedora 40+) |
| `Package 'gtk+-3.0' not found` | `gtk3-devel` |
| AppImage: `fuse: failed to open /dev/fuse` | `fuse`/`fuse3`, права пользователя, иногда `./Underlator-….AppImage --appimage-extract-and-run` |
| bundling: `Strip call failed` / `.relr.dyn` | На Fedora: `NO_STRIP=1` (и при нужде `APPIMAGE_EXTRACT_AND_RUN=1`) перед `cargo tauri build` |
| Запуск открывает диалог AppImageLauncher | `APPIMAGELAUNCHER_DISABLE=1` и/или `--appimage-extract-and-run` |
| `GStreamer element appsink not found` | Хостовый `gstreamer1-plugins-base` (часто warning без краша UI) |
| Серое/пустое окно + `Failed to create GBM buffer` | WebKitGTK DMABUF; в host на Linux выставляется `WEBKIT_DISABLE_DMABUF_RENDERER=1` до webview (см. Tauri linux-graphics). Пересоберите AppImage после фикса. Вручную: `WEBKIT_DISABLE_DMABUF_RENDERER=1 ./….AppImage` |
| Кнопка «Чаты» → «приложение не отвечает», Settings ок | React `<ViewTransition>` + `startTransition` на WebKitGTK; сайдбар без ViewTransition. Пересоберите frontend/AppImage |
| Toast «Ошибка запроса» при живом `curl :11434` | Часто `think: true` на модели без thinking (Ollama: `does not support thinking`). UI больше не шлёт think по умолчанию; core делает один retry без `think`. Проверьте имя модели в настройках (`ollama list`). |
| Windows: missing WebView2 | установить WebView2 Evergreen Runtime |
| macOS: codesign / Gatekeeper при первом запуске | локальная unsigned debug/release сборка; notarize вне 5.2 |
| Frontend dist пустой / 404 UI | сначала `npm run build` в `react-app` или довериться `beforeBuildCommand` |

## Команды: Dev и Release

Все команды ниже — из **корня репозитория**, если не указано иное. Feature host: **`desktop`**.

### Dev (`cargo tauri dev`)

```bash
# deps: см. prerequisites; Ollama желательно уже слушает :11434
cd crates/underlator-tauri
cargo tauri dev --features desktop
```

`beforeDevCommand` поднимает Vite (`npm run start` в `react-app`) на `http://localhost:5173`.

Ручной эквивалент без hook:

```bash
# терминал 1
cd react-app && npm run start
# терминал 2
cd crates/underlator-tauri && cargo tauri dev --features desktop
```

### Release build (общий каркас)

`beforeBuildCommand` собирает `react-app` → `react-app/dist`. Можно и вручную:

```bash
cd react-app && npm run build && cd ..
cd crates/underlator-tauri
cargo tauri build --features desktop
```

Затем rename к канону:

```bash
./scripts/rename-desktop-artifacts.sh
# dry-run без сборки:
./scripts/rename-desktop-artifacts.sh --dry-run
```

Канонические имена (версия из `crates/underlator-tauri/tauri.conf.json`, сейчас **`0.1.0-beta`**):

| Платформа | Формат | Каноническое имя |
| --- | --- | --- |
| Linux x86_64 | AppImage | `Underlator-0.1.0-beta-linux-x86_64.AppImage` |
| macOS arm64 | DMG | `Underlator-0.1.0-beta-macos-arm64.dmg` |
| Windows 11 | portable zip с `.exe` | `Underlator-0.1.0-beta-win-x64-portable.zip` |

**Не** DoD 5.2: `.deb`, MSI, NSIS — не считаются заменой AppImage / DMG / portable zip.

Выход rename-скрипта по умолчанию: `dist-desktop/`.

### Linux: AppImage (Fedora 44)

```bash
cd react-app && npm run build && cd ..
cd crates/underlator-tauri
# Fedora 40+/44: linuxdeploy ship-strip не понимает ELF `.relr.dyn` → NO_STRIP=1
NO_STRIP=1 APPIMAGE_EXTRACT_AND_RUN=1 \
  cargo tauri build --features desktop --bundles appimage
cd ../..
# если CARGO_TARGET_DIR нестандартный — передайте --bundle-root
./scripts/rename-desktop-artifacts.sh
ls -la dist-desktop/Underlator-*-linux-x86_64.AppImage
chmod +x dist-desktop/Underlator-*-linux-x86_64.AppImage
# Запуск .AppImage
./dist-desktop/Underlator-0.1.0-beta-linux-x86_64.AppImage --appimage-extract-and-run
# альтернатива: extract → AppRun (тот же payload AppImage)
#   ./Underlator-0.1.0-beta-linux-x86_64.AppImage --appimage-extract
#   APPIMAGELAUNCHER_DISABLE=1 UNDERLATOR_DATA_DIR=/tmp/u ./squashfs-root/AppRun
```

Опциональный живой MVP smoke внутри host (те же thin handlers, что invoke; против локального Ollama, не mock):

```bash
UNDERLATOR_ACCEPTANCE_SMOKE=1 \
UNDERLATOR_SMOKE_MODEL=qwen2.5:0.5b \
UNDERLATOR_DATA_DIR=/tmp/underlator-smoke \
APPIMAGELAUNCHER_DISABLE=1 \
  ./dist-desktop/Underlator-0.1.0-beta-linux-x86_64.AppImage --appimage-extract-and-run
# → $UNDERLATOR_DATA_DIR/acceptance-smoke.json (all_ok)
```

Smoke против локального Ollama (обязательный gate 5.2 — **не** заменяется `tauri dev` / unit-mock):

1. Запустить Ollama: `ollama serve` (или systemd), URL `http://127.0.0.1:11434`
2. Запустить канонический AppImage
3. UI → транспорт Tauri (`TauriTransport`)
4. MVP: `model` (list / generate+progress / stop; install/remove по окружению), `catalog` (get/search/getModelInfo), `chat` (CRUD + addMessage + persist)

### macOS arm64: DMG (пошагово)

На машине **Apple Silicon**:

```bash
rustup target add aarch64-apple-darwin
cd react-app && npm run build && cd ..
cd crates/underlator-tauri
cargo tauri build --features desktop --target aarch64-apple-darwin --bundles dmg
cd ../..
./scripts/rename-desktop-artifacts.sh
open dist-desktop/Underlator-0.1.0-beta-macos-arm64.dmg
```

После монтирования DMG — перенести приложение в Applications (или запустить из тома) и выполнить тот же MVP smoke vs локальный Ollama.

### Windows 11: portable zip (пошагово)

В `tauri.conf.json` targets **не** включают NSIS/MSI как DoD. На Windows достаточно release `.exe`, затем упаковка в portable zip:

```bash
cd react-app && npm run build && cd ..
cd crates/underlator-tauri
cargo tauri build --features desktop --no-bundle
cd ../..
./scripts/rename-desktop-artifacts.sh
# → dist-desktop/Underlator-0.1.0-beta-win-x64-portable.zip
```

PowerShell-альтернатива упаковки, если bash/zip недоступны:

```powershell
$exe = Get-ChildItem -Recurse -Filter underlator-tauri.exe target, crates\underlator-tauri\target |
  Where-Object { $_.FullName -match '\\release\\' -and $_.FullName -notmatch '\\nsis\\|\\msi\\' } |
  Select-Object -First 1
New-Item -ItemType Directory -Force dist-desktop | Out-Null
Copy-Item $exe.FullName dist-desktop\Underlator.exe
Compress-Archive -Path dist-desktop\Underlator.exe -DestinationPath dist-desktop\Underlator-0.1.0-beta-win-x64-portable.zip -Force
```

Распаковать zip → запустить `Underlator.exe` → MVP smoke vs Ollama.

## Матрица verified / unverified

| Артефакт | Статус | Примечание |
| --- | --- | --- |
| Fedora Workstation 44 · `Underlator-*-linux-x86_64.AppImage` | **verified** | Жёсткий gate 5.2: канонический AppImage + UI + живой MVP smoke vs Ollama (`acceptance-smoke.json`, `all_ok`); не `tauri dev` / не mock |
| macOS arm64 · `Underlator-*-macos-arm64.dmg` | **unverified** | Docs + команды выше; нет машины агента |
| Windows 11 · `Underlator-*-win-x64-portable.zip` | **unverified** | Docs + команды выше; нет машины агента |

Статусы macOS/Windows **не** ослабляют Linux AppImage gate.

## Gate перед атомом 6.1

Не начинать удаление Electron / `ElectronTransport` / `electron-app`, пока:

1. Канонический AppImage на **Fedora Workstation 44** прошёл живой MVP smoke vs локальный Ollama
2. В репозитории есть этот документ с командами для macOS arm64 DMG и Windows portable zip
3. Матрица выше заполнена (`verified` / `unverified`)

Атом 5.2 **сам** Electron не удаляет.
