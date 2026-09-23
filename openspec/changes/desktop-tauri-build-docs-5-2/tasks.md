# Tasks

## 1. Version and Tauri bundle config

- [x] 1.1 Выровнять `version` в `crates/underlator-tauri/tauri.conf.json` к канону **`0.1.0-beta`** (или согласованному semver продукта, если явно сменят в apply; шаблон имён должен совпасть с таблицей артефактов) и проверить, что `productName` остаётся `Underlator`
- [x] 1.2 Добавить в `tauri.conf.json` секцию `bundle` с targets: Linux **AppImage**, macOS **dmg**, Windows portable-путь (zip с `.exe`; NSIS/MSI не DoD); проверить, что conf валиден схемой Tauri 2 и `frontendDist` / `devUrl` из 5.1 сохранены
- [x] 1.3 Настроить `beforeBuildCommand` / `beforeDevCommand` (или эквивалентные scripts) для сборки `react-app` → `dist`, либо задокументировать явный ручной шаг, если hooks неудобны; проверить, что release-сборка подхватывает UI без ad-hoc только-`tauri-dev` пути

## 2. Canonical artifact naming scripts

- [x] 2.1 Добавить script/make/companion (минимальный) для rename/copy артефактов к канону: `Underlator-<version>-linux-x86_64.AppImage`, `Underlator-<version>-macos-arm64.dmg`, `Underlator-<version>-win-x64-portable.zip`; проверить dry-run/документированный пример на Linux имени
- [x] 2.2 Убедиться, что `.deb` / MSI / NSIS **не** объявлены обязательным DoD и не подменяют канонические форматы в scripts/docs; проверить текст DoD/doc на отсутствие такой подмены

## 3. Developer documentation

- [x] 3.1 Создать `docs/DESKTOP_TAURI.md`: Desktop (Tauri) vs Docker (server) vs (временно) Electron; env (`OLLAMA_BASE_URL`, app data dir / `UNDERLATOR_DATA_DIR`, при необходимости `UNDERLATOR_PROVIDER_ID`); проверить, что разделы читаемы с нуля клонировавшим репо
- [x] 3.2 В том же документе — native prerequisites: Linux (GTK/WebKitGTK + deps AppImage на Fedora), macOS (Xcode CLT/WebView, arm64), Windows 11 (WebView2 / build tools для portable); плюс типичные ошибки deps; проверить полноту списков относительно design
- [x] 3.3 Задокументировать команды: сборка `react-app` → `cargo tauri dev` / `cargo tauri build` с feature `desktop`; пошагово Linux AppImage, macOS arm64 DMG, Windows portable zip (+ rename); проверить, что команды копипастятся из doc
- [x] 3.4 Добавить матрицу `verified` / `unverified` (Fedora 44 AppImage, macOS arm64, Windows 11) и явную фразу gate перед 6.1; проверить наличие таблицы в doc
- [x] 3.5 Добавить в README (EN и/или RU по принятому в репо) короткий указатель на `docs/DESKTOP_TAURI.md` без выпила Electron; проверить ссылку

## 4. Linux AppImage build on Fedora Workstation 44

- [x] 4.1 Установить/проверить native deps на **Fedora Workstation 44** по doc; проверить, что `cargo check -p underlator-tauri --features desktop` (или эквивалент) проходит на этой машине
- [x] 4.2 Собрать production `react-app` + `cargo tauri build` (feature `desktop`) и получить AppImage; применить rename к `Underlator-0.1.0-beta-linux-x86_64.AppImage` (или актуальному `<version>`); проверить существование файла с каноническим именем
- [x] 4.3 Запустить канонический AppImage на Fedora 44 (не только `tauri dev`); проверить, что UI открывается и выбирается `TauriTransport`

## 5. Fedora AppImage live MVP smoke (жёсткий gate)

- [x] 5.1 При локальном Ollama выполнить smoke **model**: list; generate с progress; stop во время generate; (по чеклисту) install/remove при необходимости; проверить живой успех в UI AppImage — **не** unit/mock
- [x] 5.2 Smoke **catalog**: get / search / getModelInfo; проверить ответы в UI AppImage
- [x] 5.3 Smoke **chat**: create / list / get / update / addMessage / delete + persist (перезапуск AppImage или проверка data dir); проверить, что данные сохраняются
- [x] 5.4 Зафиксировать в DoD ниже результат AppImage gate = **pass** (без N/A); явно отметить, что `tauri dev` / unit/mock / «бинарь собрался» **не** засчитывались как замена

## 6. macOS / Windows docs and verification matrix

- [x] 6.1 Довести пошаговые инструкции macOS arm64 `.dmg` и Windows portable `.zip` в `DESKTOP_TAURI.md` до воспроизводимости; проверить полноту commands + rename
- [x] 6.2 Если есть машина — выполнить сборку/smoke и поставить `verified`; иначе оставить `unverified` + инструкцию; проверить, что Linux gate при этом не ослаблен
- [x] 6.3 Обновить матрицу в doc фактическими статусами; проверить согласованность с DoD

## 7. Regression and scope guards

- [x] 7.1 Прогнать `cargo check --workspace` (код выхода 0); при затронутом core — `cargo test -p underlator-core` включая `--test architecture`; host unit-тесты 5.1 не обязаны заменять AppImage smoke
- [x] 7.2 Скан diff: нет выпила Electron / `ElectronTransport` / `electron-app`; нет RAG/splash/embedded Ollama; нет смены DTO/бизнес-логики core «с нуля»; нет обязательного CI release upload; server/docker без лишних правок; проверить `git diff` / review
- [x] 7.3 Убедиться, что MVP commands/DTO host 5.1 не переписаны «с нуля» — только conf/scripts/docs (+ точечный wiring, если AppImage smoke вскрыл дыру границы); проверить ограниченный scope diff

## Definition of Done (DoD)

Change `desktop-tauri-build-docs-5-2` считается выполненным **только если** все пункты ниже истинны (без N/A на Linux AppImage gate):

1. **Канонические артефакты** (версия из `tauri.conf` / semver; пример `0.1.0-beta`):
   - Linux: `Underlator-<version>-linux-x86_64.AppImage`
   - macOS: `Underlator-<version>-macos-arm64.dmg` (docs + команды; smoke = verified|unverified)
   - Windows: `Underlator-<version>-win-x64-portable.zip` (docs + команды; smoke = verified|unverified)
   - `.deb` / MSI / NSIS **не** приняты как замена DoD-форматов
2. **`tauri.conf.json` + scripts** настроены под targets выше; цепочка `react-app` → `cargo tauri build` (feature `desktop`) документирована и воспроизводима
3. Существует **`docs/DESKTOP_TAURI.md`** (и указатель в README): режимы Tauri vs Docker vs Electron; prerequisites; env (`OLLAMA_BASE_URL`, data dir); типичные ошибки deps; сборка каждого артефакта; **матрица verified/unverified**
4. **Жёсткий gate Fedora Workstation 44** — атом **НЕ принят**, пока всё ниже не pass:
   - Собран канонический `Underlator-*-linux-x86_64.AppImage`
   - AppImage **запускается** на этой Fedora
   - UI доступен
   - Живой smoke MVP против **локального Ollama**: `model` (generate/stop; list/install/remove по чеклисту), `catalog` (get/search/getModelInfo), `chat` (CRUD + persist / addMessage)
   - `cargo tauri dev`, unit/mock host-тесты 5.1 и «бинарь/файл AppImage появился» **НЕ** заменяют этот gate
5. macOS/Windows: docs+команды обязательны; фактический smoke = `verified` при наличии машины, иначе `unverified` + пошаговая инструкция; это **не** ослабляет п.4
6. `cargo check --workspace` = 0 где применимо; arch-lint/core tests — если трогали core (ожидаемо не трогать)
7. **Gate перед 6.1:** 5.2 закрыт (п.4 + docs п.3/5) → только тогда можно начинать выпил Electron; в этом change Electron **не** удалён
8. **Не** сделаны: 6.1; RAG/splash/embedded Ollama; новая бизнес-логика/смена DTO в core; широкий FSD-рефакторинг; обязательный CI matrix/upload; подмена форматов `.deb`/MSI/NSIS
9. Все чекбоксы в этом `tasks.md` отмечены `[x]`

### Ручной чеклист приёмки AppImage (Fedora Workstation 44)

Отметить только после **живого** запуска канонического AppImage (не `tauri dev`, не mock):

**AppImage gate = pass** (2026-09-23, Fedora Workstation 44; повтор после фикса серого экрана WebKitGTK DMABUF).

- Канонический `Underlator-0.1.0-beta-linux-x86_64.AppImage`
- UI чата отрисовывается (не серое окно); в host на Linux по умолчанию `WEBKIT_DISABLE_DMABUF_RENDERER=1`
- Живой `UNDERLATOR_ACCEPTANCE_SMOKE` vs локальный Ollama (`acceptance-smoke.json`, `all_ok: true`)
- **Не** засчитаны: `tauri dev`, unit/mock, «бинарь появился» без UI/smoke

Отметить только после **живого** запуска канонического AppImage (не `tauri dev`, не mock):

- [x] AppImage стартует; UI загружается; транспорт Tauri
- [x] model: list
- [x] model: generate + progress в UI
- [x] model: stop во время generate
- [x] model: install / remove (если применимо к smoke-окружению) — skipped (модели уже локальны; опционально `UNDERLATOR_SMOKE_INSTALL_REMOVE=1`)
- [x] catalog: get / search / getModelInfo
- [x] chat: create / list / get / update / addMessage / delete
- [x] chat persist после перезапуска AppImage (или проверка data dir)
- [x] Каноническое имя файла AppImage совпадает с таблицей
- [x] Матрица: Fedora 44 AppImage = **verified**; macOS / Windows = verified|unverified зафиксированы в doc

## Out of scope (явно не делать)

- Атом 6.1: удаление Electron / `ElectronTransport` / `electron-app`
- RAG, splash runtime, embedded Ollama installer
- Новая бизнес-логика или смена DTO в `underlator-core`
- Правки `underlator-server` / docker вне крайней дыры контракта
- Широкий рефакторинг React/FSD вне нужного для desktop build/run
- Обязательный `.deb` / MSI / NSIS вместо канонических форматов
- Считать unit/mock / `tauri dev` из 5.1 заменой AppImage smoke на Fedora 44
- Обязательный CI matrix / release upload артефактов (опционально, не блокер)
