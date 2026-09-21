# Proposal

## Why

Атом 3.1 уже выставил REST/SSE для MVP `model` / `catalog` / `chat`, но `react-app` по-прежнему вызывает `window.electron` из хуков, chat API и settings. Без transport-agnostic `BackendClient` один UI не может работать в docker/server-режиме, а переход на Tauri потребует правок фич под каждый host. Сейчас — атом 4.1: единый клиентский контракт в FSD `shared`, без приёмки UX 4.2 и без host Tauri 5.x.

## What Changes

- Ввести в `react-app` слой `BackendClient` (FSD `shared/api`): интерфейс MVP = `model` / `catalog` / `chat` как в `electron-app/src/preload.ts`, payload'ы = DTO ядра (JSON-ключи без переименования)
- Реализовать `HttpTransport`: `fetch` для унарных REST + **SSE** (`text/event-stream`) для `generate` / `install` (не WebSocket)
- Реализовать `ElectronTransport`: адаптер к текущему `window.electron`, чтобы desktop Electron не сломался
- Реализовать `TauriTransport`: типизированный скелет `invoke` / events по карте имён ядра; полная wiring host — атом 5.1, **без** новой бизнес-логики в `underlator-tauri`
- Выбор транспорта: явный `VITE_BACKEND_MODE` и runtime detect (`__TAURI__` / `window.electron` / иначе HTTP)
- Перевести `feature-provider`, `use-model` и chat APIs (`shared/apis/chat-ipc` и catalog/model-клиент settings) на `BackendClient`
- Сохранить FSD: widgets не импортируют transport-модули напрямую
- Зафиксировать в design таблицу TS ↔ HTTP/SSE атома 3.1 (`/api/model|catalog|chat`, SSE-имена, финал `result`, ошибки `{ class, message }`)
- **Не** делать: атом 4.2 (ручной E2E UX / docker compose приёмка) сверх того, без чего 4.1 не собрать; атом 5.x; RAG / splash / выпил Electron; новую логику в `underlator-core` / смену JSON DTO; правки MVP routes в `underlator-server` без крайней необходимости

## Capabilities

### New Capabilities

- `react-backend-client`: transport-agnostic клиент MVP в `react-app` (контракт `model`/`catalog`/`chat`, Http/Electron/Tauri транспорты, выбор режима, FSD-границы, перевод существующих вызовов IPC)

### Modified Capabilities

- _(нет)_ Существующие спеки `mvp-api-contract` и `server-http-adapter` уже описывают DTO и HTTP/SSE host; этот атом потребляет их, не меняя требования ядра и server.

## Impact

- Код: в основном `react-app/src/shared/api` (новый слой), `shared/lib/hooks/use-model` (`feature-provider`, `use-model`, `apis/model-ipc`), `shared/apis/chat-ipc`, `widgets/settings/apis/model-and-catalog-ipc` (уход от прямого `window.electron`), точечно `vite.config.ts` / env (`VITE_BACKEND_MODE`, base URL). `rag-ipc` и `splash` остаются на Electron
- Поведение Electron happy-path MUST сохраниться через `ElectronTransport`
- `underlator-core` и MVP routes `underlator-server` MUST NOT меняться этим атомом; дыры контракта (например обрыв SSE без `result`) описываются в design, не раздувая scope
- `underlator-tauri` MUST NOT получить MVP commands из 4.1
- Следующие атомы: 4.2 — ручная приёмка UX на server; 5.1 — host commands и живой `TauriTransport`
