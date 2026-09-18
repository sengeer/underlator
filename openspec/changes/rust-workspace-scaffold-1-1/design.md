# Design

## Context

Источник: `.cursor/docs/ARCHITECTURAL_PLAN_TAURI_RUST_DUAL_MODE_V1.md`, атом **1.1**.  
Сейчас backend — Electron/Node; React — отдельный frontend. Цель dual-mode: общий Rust-core + hosts Tauri и Axum. Этот change только кладёт пустые/минимальные crates и docker stubs.

## Goals / Non-Goals

**Goals:**

- Рабочий `cargo check --workspace` для трёх members
- Явные границы: core library, server binary, tauri app
- Docker stubs как место будущей поставки web-режима
- Electron и React не ломаются

**Non-Goals:**

- Реализация use-cases `model` / `catalog` / `chat`
- Формализация DTO из preload (это `1.2`)
- Полный Tauri UI wiring / Axum routes / static SPA
- RAG, splash, выпил Electron
- Публикация образов в registry

## Decisions

1. **Один Cargo workspace в корне репо**  
   Не отдельные git-репозитории. Members: `crates/underlator-core`, `crates/underlator-server`, `crates/underlator-tauri`.

2. **Минимальные stubs, не «полный Tauri scaffold любой ценой»**  
   Tauri crate должен компилироваться в workspace. Если полноценный `tauri init` требует тяжёлых native deps на CI/dev-машине, допустим тонкий stub с feature-gated/`cargo check`-friendly каркасом, но структура каталогов и зависимость на core обязательны. Предпочтительно стандартный Tauri 2 skeleton, если окружение позволяет.

3. **Server зависит от core; Tauri зависит от core; core не зависит от server/tauri**  
   Зависимости только вниз к core.

4. **Базовые deps в core**  
   `tokio`, `serde` (+ derive), `thiserror`, `tracing`, HTTP-клиент (`reqwest` с нужными features или эквивалент). Server: заготовка `axum` + `tokio`. Полные routes — позже.

5. **docker/**  
   `Dockerfile` и `docker-compose.yml` как stubs с комментариями/placeholder (Ollama sidecar, volume `/data`), без требования успешного multi-stage build UI в этом change.

6. **`.gitignore`**  
   Добавить `target/` на корневом уровне, если ещё нет.

## Risks / Trade-offs

- **Tauri native deps** могут сломать `cargo check` на машине без WebKit/GTK — mitigation: документировать deps в README stub или временно `cfg`/`optional`; DoD требует `cargo check --workspace` на машине исполнителя.
- **Корневой `package.json`** для OpenSpec рядом с `react-app`/`electron-app` — ок, не смешивать npm workspaces без нужды.
- **Пустые crates** соблазняют писать логику в host — границы усилены Cursor rules.
