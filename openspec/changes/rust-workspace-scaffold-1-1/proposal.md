# Proposal

## Why

Миграция Underlator на Rust / Tauri 2 и dual-mode (desktop + docker) требует сначала каркас backend в текущем репозитории. Без workspace и трёх crates агент и разработчики начнут раскладывать логику хаотично; атом `1.1` из архитектурного плана фиксирует структуру до любой бизнес-логики.

## What Changes

- Добавить корневой Cargo workspace в репозиторий Underlator
- Добавить library crate `crates/underlator-core`
- Добавить binary crate `crates/underlator-server` (заготовка под Axum)
- Добавить Tauri 2 app crate `crates/underlator-tauri` (тонкий host)
- Добавить `docker/` stubs (Dockerfile + compose без полной сборки UI)
- Подключить базовые зависимости core: `tokio`, `serde`, `thiserror`, `tracing`, HTTP-стек
- Обеспечить smoke: `cargo check --workspace`
- **Не** удалять и не ломать `electron-app` и `react-app`
- **Не** реализовывать MVP API (`model` / `catalog` / `chat`) и RAG в этом change

## Capabilities

### New Capabilities

- `rust-workspace`: структура monorepo Rust (workspace members, границы crates, docker stubs, smoke-сборка)

### Modified Capabilities

- (нет — в `openspec/specs/` ещё нет существующих capabilities)

## Impact

- Новые пути: корневой `Cargo.toml`, `crates/*`, `docker/*`, `target/` (gitignore)
- Существующие `electron-app` и `react-app` остаются рабочими без обязательных правок
- Dev-зависимость: локальный `@fission-ai/openspec` уже в корневом `package.json`
- Следующий change после archive: атом `1.2` (DTO/контракт из preload)
