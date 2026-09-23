# Proposal

## Why

Атом 5.1 уже дал thin Tauri host и рабочий `TauriTransport`, но desktop остаётся «секретным» путём через `tauri dev` / unit-mock: нет воспроизводимых релизовых артефактов с каноническими именами, нет developer-doc по native deps и режимам Desktop vs Docker vs Electron, а жёсткий gate перед выпилом Electron (6.1) — **рабочий AppImage на Fedora Workstation 44** — ещё не закрыт. Атом 5.2 закрывает shipping/devtools gap **до** 6.1.

## What Changes

- Настроить `tauri.conf.json` (и scripts / post-build rename при нужде) под канонические релизовые артефакты и targets:
  - Linux x86_64 **AppImage** → `Underlator-<version>-linux-x86_64.AppImage` (пример: `Underlator-0.1.0-beta-linux-x86_64.AppImage`)
  - macOS **arm64** `.dmg` → `Underlator-<version>-macos-arm64.dmg`
  - Windows 11 **portable** zip (допустимо rar) с `.exe` → `Underlator-<version>-win-x64-portable.zip`
- Выровнять сегмент версии продукта с `tauri.conf` / semver (канонический пример плана — `0.1.0-beta`; сейчас в conf — `0.1.0`)
- Зафиксировать команды: сборка `react-app` → `cargo tauri dev` / `cargo tauri build` с feature `desktop` для `underlator-tauri`
- Добавить `docs/DESKTOP_TAURI.md` (и/или раздел README): prerequisites по ОС; Desktop (Tauri) vs Docker (server) vs (временно) Electron; env (`OLLAMA_BASE_URL`, data dir / `UNDERLATOR_DATA_DIR`); типичные ошибки deps; сборка каждого артефакта; матрица `verified` / `unverified`
- Жёсткая приёмка на **Fedora Workstation 44**: полный smoke живого AppImage против локального Ollama (`model` / `catalog` / `chat`); `tauri dev`, unit/mock и «бинарь собрался» **не** заменяют gate
- Docs + команды для macOS/Windows обязательны; фактический smoke там — `verified` или `unverified` + пошаговая инструкция
- Опереться на закрытый 5.1 (thin host + `TauriTransport`); **не** переписывать MVP commands/DTO «с нуля»
- **Не** делать: 6.1 (Electron / `ElectronTransport` / `electron-app`); RAG / splash / embedded Ollama; новую бизнес-логику или смену DTO в core; правки server/docker вне крайней дыры контракта; обязательный `.deb` / MSI/NSIS вместо канонических форматов; обязательный CI matrix / release upload

## Capabilities

### New Capabilities

- `desktop-tauri-build`: воспроизводимая сборка/запуск Tauri desktop; канонические артефакты AppImage / macOS arm64 DMG / Windows portable zip; developer docs (prerequisites, env, режимы, типичные ошибки); матрица `verified`/`unverified`; жёсткий Fedora 44 AppImage smoke-gate как условие закрытия атома и gate перед 6.1

### Modified Capabilities

- `rust-workspace`: после атома 5.2 crate `underlator-tauri` MUST поддерживать документированную release-сборку с каноническими bundle targets (не только scaffold/`tauri dev`); workspace MUST сохранять `cargo check --workspace` и Intact Electron/React до 6.1
- `tauri-thin-host`: уточнение скоупа приёмки — unit/mock / `tauri dev` из 5.1 MUST NOT считаться заменой shipping AppImage smoke; удаление Electron по-прежнему вне скоупа thin-host и 5.2

## Impact

- Код/конфиг: в основном `crates/underlator-tauri/tauri.conf.json` (bundle targets, version, beforeBuild/dev hooks при нужде), scripts rename артефактов, возможно корневые/package scripts; точечные ссылки в README
- Документация: новый `docs/DESKTOP_TAURI.md` (каталога `docs/` сейчас нет); без смены MVP DTO/commands
- Host wiring 5.1 (`commands`, `AppState`, `DesktopConfig` / `OLLAMA_BASE_URL`) остаётся; core без новой бизнес-логики
- Electron и docker/server режимы остаются; 6.1 запрещён до закрытия AppImage gate на Fedora 44 + docs для остальных артефактов
- Опциональный CI/release upload — вне обязательного DoD
