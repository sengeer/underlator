# Proposal

## Why

Host-слои Tauri и Axum, а затем React `BackendClient`, должны опираться на один типизированный контракт `model` / `catalog` / `chat`. Сейчас этот контракт живёт только в Electron `preload.ts` и связанных TS-типах; без зеркала в `underlator-core` каждый host начнёт изобретать свои payload'ы.

## What Changes

- Добавить в `crates/underlator-core` модули DTO, зеркалирующие публичный MVP-контракт из `electron-app/src/preload.ts`: `model`, `catalog`, `chat` и progress-события
- Зафиксировать naming map: IPC name → core use-case → будущий HTTP path (и имя Tauri command как черновик host-адаптера)
- Обеспечить `serde` Serialize/Deserialize для обоих будущих hosts без смены смысла полей для frontend
- Оставить placeholder-модули `rag` / `splash` без DTO
- **Не** реализовывать бизнес-логику use-cases, HTTP-клиент, Ollama-провайдер, RAG, server routes и правки React

## Capabilities

### New Capabilities

- `mvp-api-contract`: типизированные DTO и карта имён MVP API (`model` / `catalog` / `chat` + progress events) в `underlator-core`

### Modified Capabilities

- (нет — `rust-workspace` описывает каркас crates, а не контракт payload'ов)

## Impact

- Код: только `crates/underlator-core` (новые модули типов/событий/карты имён, rustdoc, serde roundtrip-тесты)
- Источник истины по смыслу: `electron-app/src/preload.ts` и типы `electron-app/src/types/{ollama,catalog,chat,models,electron}.ts`
- `electron-app` и `react-app` не меняются в этом атоме
- `underlator-server` / `underlator-tauri` не получают routes/commands; HTTP path и Tauri names — только карта для следующих атомов
- Следующие атомы: 2.3 (use-cases поверх этих DTO), 3.1 (HTTP routes), 4.1 (`BackendClient`), 5.1 (Tauri commands)
