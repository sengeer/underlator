# Design

## Context

См. `proposal.md` (Why) и delta-спеки `desktop-tauri-build` / `rust-workspace` / `tauri-thin-host`. Источник атома: `.cursor/docs/ARCHITECTURAL_PLAN_TAURI_RUST_DUAL_MODE_V1.md` §5.2. Атом 5.1 уже закрыл thin host: MVP commands/events, `DesktopConfig` (`OLLAMA_BASE_URL`, `UNDERLATOR_DATA_DIR`), `TauriTransport`, feature `desktop`.

Наблюдаемое сейчас:

- `crates/underlator-tauri/tauri.conf.json`: `productName` Underlator, `version` **`0.1.0`** (план/канон примера — **`0.1.0-beta`**), `frontendDist` → `../../react-app/dist`, `devUrl` → Vite; **нет** секции `bundle` / targets AppImage|dmg|portable
- Feature `desktop` в `Cargo.toml` host; workspace check без WebView остаётся валидным путём CI
- Каталога `docs/` и `DESKTOP_TAURI.md` нет; README описывает Electron/Ollama UX, не Tauri release-сборку
- Host MVP и DTO менять не нужно — только shipping/devtools слой

## Goals / Non-Goals

**Goals:**

- Воспроизводимая release-сборка Tauri desktop с каноническими именами артефактов
- Документ для клонировавших репо: deps, команды, режимы, env, матрица verified/unverified
- Жёсткий gate: рабочий AppImage на Fedora Workstation 44 + живой MVP smoke vs локальный Ollama
- Явный gate «5.2 закрыт → можно планировать 6.1» (без выполнения 6.1)

**Non-Goals:**

- Удаление Electron / `ElectronTransport` / `electron-app`
- RAG, splash, embedded Ollama installer
- Новая бизнес-логика / смена DTO в `underlator-core`
- Правки server/docker вне крайней дыры контракта
- Обязательный `.deb` / MSI/NSIS как DoD
- Обязательный CI matrix / upload релизов
- Переписывание MVP commands «с нуля»

## Decisions

1. **Что меняется vs что остаётся как в 5.1**

   | Остаётся (5.1) | Меняется (5.2) |
   | --- | --- |
   | MVP commands/events, `AppState`, hex-границы | `tauri.conf.json` → `bundle` targets + version alignment |
   | `TauriTransport` / detect | scripts / post-build rename к каноническим именам |
   | `DesktopConfig` / env (`OLLAMA_BASE_URL`, data dir) | `docs/DESKTOP_TAURI.md` + ссылка из README |
   | Feature `desktop` | beforeBuild/devCommand при нужде для `react-app` |
   | Unit/mock host-тесты | **не** DoD-замена; добавляется AppImage smoke |

   *Альтернатива:* пересобрать host commands под «release profile» — отклонено; 5.1 достаточен.

2. **Версия в канонических именах**

   Выровнять `tauri.conf.json` `version` (и при необходимости workspace/product label) к **`0.1.0-beta`**, чтобы артефакт совпал с таблицей плана: `Underlator-0.1.0-beta-linux-x86_64.AppImage`. При будущей смене semver меняется только сегмент `<version>`; шаблон имени и scripts rename остаются.

   *Альтернатива:* оставить `0.1.0` и документировать другое имя — отклонено: противоречит канону §5.2 и DoD пользователя.

3. **Bundle targets в Tauri 2**

   - Linux: `appimage` (не требовать `deb` в DoD)
   - macOS: `dmg`, сборка/инструкция только для `aarch64-apple-darwin`
   - Windows: portable — предпочтительно zip с `.exe` (Tauri `nsis`/`msi` не DoD; если bundler даёт иной intermediate — post-step упаковать portable zip с каноническим именем)

   Rename: если Tauri выдаёт `Underlator_0.1.0-beta_amd64.AppImage` и т.п. — скрипт/make target/`cargo`-companion копирует/переименовывает в канон и документируется в `DESKTOP_TAURI.md`.

   *Альтернатива:* только ручной rename без conf targets — отклонено как хрупкий DX.

4. **Команды сборки**

   Канонический поток (уточнить пути CLI при apply; Tauri 2 часто через `cargo tauri` из crate dir или workspace):

   1. Native deps по ОС (doc)
   2. `react-app`: production build в `dist/`
   3. `cargo tauri build` с feature `desktop` для `underlator-tauri` (dev: `cargo tauri dev` + Vite)
   4. Rename → каноническое имя
   5. Linux: запуск AppImage на Fedora 44 → smoke

   `beforeBuildCommand` / `beforeDevCommand` в conf — предпочтительно, чтобы не забыть frontend; если уже собирают вручную — зафиксировать оба пути в doc.

5. **Документ `docs/DESKTOP_TAURI.md`**

   Структура:

   - Режимы: Tauri desktop / Docker server / Electron (временно)
   - Prerequisites Linux (Fedora + AppImage), macOS arm64, Windows 11
   - Env: `OLLAMA_BASE_URL`, `UNDERLATOR_DATA_DIR` / app data dir, при необходимости `UNDERLATOR_PROVIDER_ID`
   - Dev vs release команды
   - Таблица артефактов + rename
   - Типичные ошибки deps (GTK/WebKit, fuse/AppImage, WebView2, Xcode CLT)
   - Матрица verified/unverified
   - Gate перед 6.1 (одна фраза)

   README: короткий указатель «Desktop Tauri → docs/DESKTOP_TAURI.md», без дублирования всей матрицы.

6. **Приёмка Fedora 44 (жёсткий gate)**

   Чеклист smoke (живой Ollama на `127.0.0.1:11434` или override):

   - Запуск `Underlator-*-linux-x86_64.AppImage`
   - UI загружается (`TauriTransport`)
   - `model`: list; generate + progress; stop
   - `catalog`: get / search / getModelInfo
   - `chat`: create/list/get/update/addMessage/delete + persist после перезапуска AppImage (или явная проверка файлов под data dir)

   Зафиксировать результат в DoD tasks (pass/fail); без N/A.

7. **macOS / Windows: docs first, smoke optional**

   На машине агента (Fedora) — только Linux verified. Mac/Win: полные команды в doc; статус `unverified` допустим. Наличие машины → выполнить smoke и поставить `verified`.

8. **Gate перед 6.1**

   Явное правило в design/docs/tasks: **не** начинать 6.1, пока:

   - AppImage gate на Fedora 44 = pass
   - Docs для DMG + portable zip = есть
   - Матрица заполнена

   5.2 **не** удаляет Electron.

9. **Workspace check**

   `cargo check --workspace` остаётся обязательным (default features без обязательного WebView на CI). Полный `tauri build` + AppImage — на Fedora с native deps, не заменяется workspace check.

## Risks / Trade-offs

- **[Risk] AppImage на Fedora падает из‑за FUSE/WebKit runtime** → Mitigation: задокументировать deps и `APPIMAGE`/`fuse` workarounds; gate не закрывать «бинарь есть».
- **[Risk] Версия `0.1.0` vs `0.1.0-beta` разъедется с CI/тегами** → Mitigation: одно место истины в `tauri.conf`; scripts читают version.
- **[Risk] Windows portable не из коробки Tauri** → Mitigation: post-pack zip + doc; не подменять DoD на NSIS.
- **[Risk] macOS unverified навсегда** → Mitigation: допустимо для 5.2; не ослабляет Linux gate; инструкция пошаговая.
- **[Risk] Искушение чинить DTO при smoke** → Mitigation: только host/conf/docs/transport wiring; domain untouched.
- **[Trade-off] Нет обязательного CI upload** → быстрее закрыть Fedora gate; релизы вручную по doc.

## Migration Plan

1. Выровнять version + добавить `bundle` / hooks в `tauri.conf.json`
2. Scripts rename + проверить Linux AppImage на Fedora 44
3. Написать `docs/DESKTOP_TAURI.md`, ссылка из README
4. Заполнить матрицу; Mac/Win — unverified или verified
5. DoD: AppImage smoke + `cargo check --workspace`
6. Rollback: revert conf/scripts/docs; host 5.1 и Electron не затрагиваются функционально

## Open Questions

- Точная команда CLI (`cargo tauri` из `crates/underlator-tauri` vs workspace alias) — зафиксировать при apply по фактическому `tauri-cli`.
- Нужен ли `beforeBuildCommand` npm/pnpm из monorepo root или только из `react-app` — выбрать по существующему package manager репо при apply.
