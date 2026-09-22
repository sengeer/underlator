# Proposal

## Why

Атомы 3.1 и 4.1 уже дают HTTP/SSE host и transport-agnostic `BackendClient`, но dual-mode не доказан на живом web-пути: React ещё не принят против `underlator-server` + Ollama. Сейчас — атом 4.2: приёмка MVP UX в server/docker до Tauri (5.x), без новой бизнес-логики.

## What Changes

- Поднять стенд `docker compose` (server + Ollama) и подключить `react-app` в HTTP-режиме (`VITE_BACKEND_MODE=http`, `VITE_BACKEND_URL`, опционально `VITE_BACKEND_TOKEN`)
- Прогнать воспроизводимые сценарии приёмки MVP: chat CRUD + `addMessage`; `model.generate` (SSE) / `stop` / `list` / `install` (progress) / `remove`; catalog `get` / `search` / `getModelInfo`
- Зафиксировать баги контракта TS ↔ Rust (JSON-ключи, SSE-имена, ошибки `{ class, message }`) и выровнять типы **точечными** фиксами только если сценарий падает
- Оставить короткий отчёт pass/fail по сценариям в change (`ACCEPTANCE.md`)
- **Не** делать: атом 5.x; выпил Electron / `ElectronTransport`; новые use-cases MVP; переписывание `BackendClient` / смену SSE→WebSocket; multi-user IAM; RAG / splash runtime; рефакторинг UI/FSD вне дыр приёмки
- RAG/PDF **не** входят в приёмку: отсутствие RAG MUST NOT блокировать MVP-сценарии (в частности delete чата)

## Capabilities

### New Capabilities

- `mvp-ux-server-acceptance`: end-to-end приёмка MVP UX в server/docker-режиме (стенд compose + HTTP React, чеклист сценариев `model`/`catalog`/`chat`, выравнивание контракта только по падениям, отчёт pass/fail, без RAG/PDF)

### Modified Capabilities

- _(нет)_ Контракт DTO (`mvp-api-contract`), HTTP/SSE host (`server-http-adapter`) и клиент (`react-backend-client`) уже заданы атомами 1.2–4.1. Этот атом потребляет их; точечные фиксы восстанавливают существующие требования, а не меняют карту операций.

## Impact

- Код: точечно `react-app` (env/стенд HTTP, дыры вроде `window.electron` в settings-тестах, RAG на пути delete чата), при необходимости `docker/Dockerfile` / compose (прокидка `VITE_BACKEND_*` / token в SPA) и минимальные правки `underlator-server` / JSON-ключей клиента **только если сценарий падает**
- Поведение: web-режим на `:8080` (same-origin static из compose) покрывает MVP-контракт; Electron остаётся; `ElectronTransport` не удаляется
- `underlator-core`: новые use-cases запрещены; смена DTO — только доказанный mismatch TS ↔ Rust
- `underlator-tauri`: без MVP commands (атом 5.1)
- Артефакт: `openspec/changes/mvp-ux-server-acceptance-4-2/ACCEPTANCE.md`
- Следующий атом: 5.1 — Tauri host над тем же core
